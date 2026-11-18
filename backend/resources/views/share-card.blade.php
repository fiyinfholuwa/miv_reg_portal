<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <meta name="description" content="{{ $description }}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="The Men of Issachar Vision">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ url()->current() }}">
    @if ($image)
        <meta property="og:image" content="{{ $image }}">
        <meta property="og:image:secure_url" content="{{ $image }}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="1080">
        <meta property="og:image:height" content="1350">
        <meta property="og:image:alt" content="{{ $title }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:image" content="{{ $image }}">
    @endif
    <meta name="twitter:title" content="{{ $title }}">
    <meta name="twitter:description" content="{{ $description }}">
    <meta http-equiv="refresh" content="0; url={{ $eventUrl }}">
    <link rel="canonical" href="{{ $eventUrl }}">
    <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06124a;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:16px}img{max-width:min(360px,90vw);border-radius:16px;display:block;margin:0 auto 16px}a{color:#f4d33d}</style>
</head>
<body>
    <main>
        @if ($image)<img src="{{ $image }}" alt="{{ $title }}">@endif
        <p><a href="{{ $eventUrl }}">Continue to the event page</a></p>
    </main>
    <script>window.location.replace(@json($eventUrl));</script>
</body>
</html>
