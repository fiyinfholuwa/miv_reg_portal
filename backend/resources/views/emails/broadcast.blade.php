@extends('emails.layout', ['subject' => $title])

@section('content')
<h1 style="margin-top:0;color:#03284a;">{{ $title }}</h1>
<p style="white-space:pre-line;">{{ $body }}</p>
@endsection
