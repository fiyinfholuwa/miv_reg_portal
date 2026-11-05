<?php

return [

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'registration_otp_expiry' => (int) env('REGISTRATION_OTP_EXPIRY', 10),
    'registration_token_years' => (int) env('REGISTRATION_TOKEN_YEARS', 5),
    'elasticemail' => [
        'api_key' => env('ELASTICEMAIL_API_KEY'),
        'from_address' => env('ELASTICEMAIL_FROM_ADDRESS', 'conference@menofissacharvision.com'),
        'from_name' => env('ELASTICEMAIL_FROM_NAME', 'Men of Issachar Vision'),
        'timeout' => (int) env('ELASTICEMAIL_TIMEOUT', 15),
        // Emails one address can receive per minute (codes, notifications). Broadcasts are exempt.
        'per_recipient_per_minute' => (int) env('ELASTICEMAIL_PER_RECIPIENT_PER_MINUTE', 2),
    ],
    'paystack' => [
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
        'base_url' => env('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
