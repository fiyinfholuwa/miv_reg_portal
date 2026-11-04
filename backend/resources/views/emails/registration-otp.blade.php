@extends('emails.layout', ['subject' => 'Your Jan. Conf 2027 verification code'])

@section('content')
<h1 style="margin-top:0;color:#03284a;">Verify your Jan. Conf 2027 registration</h1>

<p>Use this one-time code to continue your delegate registration:</p>

<p style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">{{ $otp }}</p>

<p>This code expires at {{ $expiresAt->format('g:i A') }}.</p>

<p>You can also continue securely using this link:</p>

<p><a href="{{ $verificationUrl }}" style="display:inline-block;background:#1469a9;color:#ffffff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Continue registration</a></p>
@endsection
