<h1>Verify your Jan. Conf 2027 registration</h1>

<p>Use this one-time code to continue your delegate registration:</p>

<p style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">{{ $otp }}</p>

<p>This code expires at {{ $expiresAt->format('g:i A') }}.</p>

<p>You can also continue securely using this link:</p>

<p><a href="{{ $verificationUrl }}">Continue registration</a></p>
