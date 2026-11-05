<?php

/*
 * Which websites may call the API from the browser.
 *
 * FRONTEND_URL is always allowed. Add more exact origins (no trailing slash)
 * with CORS_ALLOWED_ORIGINS, comma-separated, e.g.
 *   CORS_ALLOWED_ORIGINS=https://menofissacharvision.com,https://www.menofissacharvision.com
 * and Vercel preview links with a regex in CORS_ALLOWED_ORIGIN_PATTERNS, e.g.
 *   CORS_ALLOWED_ORIGIN_PATTERNS=#^https://miv-[a-z0-9-]+\.vercel\.app$#
 */
$origins = array_filter(array_map(
    fn (string $origin): string => rtrim(trim($origin), '/'),
    [env('FRONTEND_URL', 'http://localhost:3000'), ...explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))],
));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique($origins)),
    'allowed_origins_patterns' => array_values(array_filter(explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', '')))),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
