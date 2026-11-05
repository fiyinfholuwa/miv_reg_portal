<?php

namespace App\Services;

use ElasticEmail\Api\EmailsApi;
use ElasticEmail\Configuration;
use ElasticEmail\Model\BodyContentType;
use ElasticEmail\Model\BodyPart;
use ElasticEmail\Model\EmailContent;
use ElasticEmail\Model\EmailTransactionalMessageData;
use ElasticEmail\Model\TransactionalRecipient;
use GuzzleHttp\Client;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * All outgoing email goes through one provider, chosen with EMAIL_PROVIDER:
 * "elasticemail" (default) or "smtp" (the MAIL_* settings, e.g. Gmail).
 *
 * - Each address can receive at most `services.elasticemail.per_recipient_per_minute`
 *   emails a minute (default 2), so codes can't be used to flood an inbox.
 *   Admin broadcasts skip this limit.
 * - Without an API key, local development writes emails to the log and tests use
 *   Laravel's mail fake; any other environment refuses to send.
 */
class EmailService
{
    private const RATE_WINDOW_SECONDS = 60;

    /**
     * @param  bool  $rateLimited  False for admin broadcasts, which must reach everyone.
     */
    public function sendMailable(Mailable $mailable, string $recipient, ?string $idempotencyKey = null, bool $rateLimited = true): void
    {
        if ($rateLimited) {
            $this->ensureCanEmail($recipient);
            RateLimiter::hit($this->rateKey($recipient), self::RATE_WINDOW_SECONDS);
        }

        if ($this->provider() === 'smtp' && ! app()->environment('testing')) {
            $this->sendWithSmtp($mailable, $recipient);

            return;
        }

        if (! $this->isConfigured()) {
            $this->sendWithoutProvider($mailable, $recipient);

            return;
        }

        $html = $mailable->render();
        $subject = $mailable->envelope()->subject ?: config('app.name', 'Men of Issachar Vision');

        $this->send(
            recipient: $recipient,
            subject: $subject,
            html: $html,
            text: $this->plainText($html),
            idempotencyKey: $idempotencyKey,
        );
    }

    /**
     * Throws a friendly 429 when this address has hit its per-minute limit.
     * Call it before doing work (like issuing a new code) that leads to an email.
     */
    public function ensureCanEmail(string $recipient): void
    {
        $key = $this->rateKey($recipient);

        if (RateLimiter::tooManyAttempts($key, $this->perMinute())) {
            $seconds = max(1, RateLimiter::availableIn($key));

            throw ValidationException::withMessages([
                'email' => ["We've just emailed this address. Please wait {$seconds} seconds before requesting another email."],
            ])->status(429);
        }
    }

    public function send(
        string $recipient,
        string $subject,
        string $html,
        ?string $text = null,
        ?string $idempotencyKey = null,
    ): void {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('Elastic Email is not configured. Add ELASTICEMAIL_API_KEY to the backend environment.');
        }

        $config = Configuration::getDefaultConfiguration()
            ->setApiKey('X-ElasticEmail-ApiKey', (string) config('services.elasticemail.api_key'));

        $emails = new EmailsApi(new Client([
            'timeout' => (int) config('services.elasticemail.timeout', 15),
        ]), $config);

        $message = new EmailTransactionalMessageData([
            'recipients' => new TransactionalRecipient([
                'to' => [$recipient],
            ]),
            'content' => new EmailContent([
                'from' => $this->fromHeader(),
                'subject' => $subject,
                'body' => [
                    new BodyPart([
                        'content_type' => BodyContentType::HTML,
                        'content' => $html,
                    ]),
                    new BodyPart([
                        'content_type' => BodyContentType::PLAIN_TEXT,
                        'content' => $text ?: $this->plainText($html),
                    ]),
                ],
            ]),
        ]);

        try {
            $emails->emailsTransactionalPost($message, $idempotencyKey);
        } catch (Throwable $exception) {
            Log::error('Elastic Email send failed', ['recipient' => $recipient, 'subject' => $subject, 'error' => $exception->getMessage()]);

            throw ValidationException::withMessages([
                'email' => ['We could not send the email right now. Please try again in a moment.'],
            ])->status(503);
        }
    }

    public function provider(): string
    {
        return config('services.email_provider') === 'smtp' ? 'smtp' : 'elasticemail';
    }

    /**
     * Sends through Laravel's SMTP mailer (MAIL_HOST, MAIL_USERNAME, …).
     */
    private function sendWithSmtp(Mailable $mailable, string $recipient): void
    {
        try {
            Mail::mailer('smtp')->to($recipient)->send($mailable);
        } catch (Throwable $exception) {
            Log::error('SMTP email send failed', ['recipient' => $recipient, 'error' => $exception->getMessage()]);

            throw ValidationException::withMessages([
                'email' => ['We could not send the email right now. Please try again in a moment.'],
            ])->status(503);
        }
    }

    public function isConfigured(): bool
    {
        return ! app()->environment('testing') && filled(config('services.elasticemail.api_key'));
    }

    /**
     * Tests go through Laravel's mail fake; local development logs the email
     * (storage/logs/laravel.log) instead of sending it; anything else is a
     * misconfiguration and fails loudly.
     */
    private function sendWithoutProvider(Mailable $mailable, string $recipient): void
    {
        if (app()->environment('testing')) {
            Mail::to($recipient)->send($mailable);

            return;
        }

        if (app()->environment('local')) {
            Mail::mailer('log')->to($recipient)->send($mailable);

            return;
        }

        Log::critical('Email not sent: ELASTICEMAIL_API_KEY is missing.', ['recipient' => $recipient]);

        throw ValidationException::withMessages([
            'email' => ['Email delivery is not set up yet. Please contact the organisers.'],
        ])->status(503);
    }

    private function rateKey(string $recipient): string
    {
        return 'email-recipient:'.sha1(Str::lower(trim($recipient)));
    }

    private function perMinute(): int
    {
        return max(1, (int) config('services.elasticemail.per_recipient_per_minute', 2));
    }

    private function fromHeader(): string
    {
        $name = trim((string) config('services.elasticemail.from_name'));
        $address = (string) config('services.elasticemail.from_address');

        return $name ? sprintf('%s <%s>', $name, $address) : $address;
    }

    private function plainText(string $html): string
    {
        return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
}
