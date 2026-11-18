<?php

namespace App\Services;

use Illuminate\Http\Request;

/** Resolves public backend URLs without requiring an admin-managed setting. */
class UploadUrlService
{
    public function url(string $path): string
    {
        return rtrim($this->baseUrl(), '/').'/'.ltrim($path, '/');
    }

    public function imageUrl(?string $image): ?string
    {
        if ($image === null || trim($image) === '') return $image;

        $path = parse_url($image, PHP_URL_PATH);
        if (! is_string($path)) return $image;

        $path = preg_replace('#^/storage(?=/uploads/)#', '', $path) ?: $path;
        if (! str_starts_with($path, '/uploads/')) return $image;

        return $this->url($path);
    }

    private function baseUrl(): string
    {
        $configured = trim((string) config('filesystems.disks.uploads.public_url', ''));
        if ($this->isPublicOrigin($configured)) return rtrim($configured, '/');

        $diskUrl = trim((string) config('filesystems.disks.uploads.url', ''));
        if ($this->isPublicOrigin($diskUrl)) return rtrim($diskUrl, '/');

        if (app()->bound('request')) {
            /** @var Request $request */
            $request = request();
            foreach ($this->forwardedOrigins($request) as $origin) {
                if ($this->isPublicOrigin($origin)) return rtrim($origin, '/');
            }
        }

        $appUrl = (string) config('app.url', '');
        if ($this->isPublicOrigin($appUrl)) return rtrim($appUrl, '/');

        return app()->bound('request')
            ? request()->getSchemeAndHttpHost()
            : 'http://localhost';
    }

    /** @return list<string> */
    private function forwardedOrigins(Request $request): array
    {
        $origins = [];
        $forwarded = (string) $request->header('Forwarded', '');
        if (preg_match('/(?:^|;)host=([^;]+)/i', $forwarded, $hostMatch)) {
            $host = trim($hostMatch[1], " \\\"'");
            $proto = 'https';
            if (preg_match('/(?:^|;)proto=([^;]+)/i', $forwarded, $protoMatch)) $proto = trim($protoMatch[1], " \\\"'");
            $origins[] = $proto.'://'.$host;
        }

        $hosts = array_merge(
            explode(',', (string) $request->header('X-Forwarded-Host', '')),
            explode(',', (string) $request->header('X-Original-Host', '')),
        );
        $proto = trim(explode(',', (string) $request->header('X-Forwarded-Proto', 'https'))[0]) ?: 'https';
        foreach ($hosts as $host) {
            $host = trim($host);
            if ($host !== '') $origins[] = $proto.'://'.$host;
        }

        return $origins;
    }

    private function isPublicOrigin(string $origin): bool
    {
        $host = parse_url($origin, PHP_URL_HOST);
        if (! is_string($host) || ! in_array(parse_url($origin, PHP_URL_SCHEME), ['http', 'https'], true)) return false;
        if (preg_match('/[\\s\\/@]/', $host) || preg_match('/^(localhost|127\\.|0\\.0\\.0\\.0|::1)(?::\\d+)?$/i', $host)) return false;
        if (str_ends_with(strtolower($host), '.local')) return false;

        return true;
    }
}
