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
use Illuminate\Support\Facades\Mail;

class EmailService
{
    /**
     * Send a Laravel mailable through Elastic Email when configured.
     *
     * Keeping the Laravel fallback makes local development and automated tests
     * useful without requiring a live provider account.
     */
    public function sendMailable(Mailable $mailable, string $recipient, ?string $idempotencyKey = null): void
    {
        if (! $this->isConfigured()) {
            Mail::to($recipient)->send($mailable);

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

        $emails->emailsTransactionalPost($message, $idempotencyKey);
    }

    public function isConfigured(): bool
    {
        return ! app()->environment('testing') && filled(config('services.elasticemail.api_key'));
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
