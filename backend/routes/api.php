<?php

use App\Http\Controllers\Api\RegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/start', [RegistrationController::class, 'start']);
    Route::post('/verify-otp', [RegistrationController::class, 'verifyOtp']);
    Route::post('/verify-link', [RegistrationController::class, 'verifyLink']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/user', [RegistrationController::class, 'user']);
        Route::put('/profile', [RegistrationController::class, 'complete']);
        Route::post('/logout', [RegistrationController::class, 'logout']);
    });
});

Route::get('/user', [RegistrationController::class, 'user'])->middleware('auth:sanctum');
