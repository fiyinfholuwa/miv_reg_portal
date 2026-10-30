<?php

use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ShopController;
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
        Route::get('/testimonials', [DashboardController::class, 'testimonials']);
        Route::post('/testimonials', [DashboardController::class, 'submitTestimonial']);
        Route::post('/feedback', [DashboardController::class, 'submitFeedback']);
        Route::get('/broadcasts', [DashboardController::class, 'broadcasts']);
    });
});

Route::prefix('admin')->group(function (): void {
    Route::post('/login', [AdminController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/overview', [AdminController::class, 'overview']);
        Route::get('/registrants', [AdminController::class, 'registrants']);
        Route::patch('/registrants/{registrant}/review', [AdminController::class, 'reviewRegistrant']);
        Route::get('/testimonials', [AdminController::class, 'testimonials']);
        Route::patch('/testimonials/{testimonial}/review', [AdminController::class, 'reviewTestimonial']);
        Route::get('/broadcasts', [AdminController::class, 'broadcasts']);
        Route::post('/broadcasts', [AdminController::class, 'createBroadcast']);
        Route::get('/shop/products', [AdminController::class, 'shopProducts']);
        Route::post('/shop/products', [AdminController::class, 'createShopProduct']);
        Route::patch('/shop/products/{product}', [AdminController::class, 'updateShopProduct']);
        Route::delete('/shop/products/{product}', [AdminController::class, 'deleteShopProduct']);
        Route::get('/partner-inquiries', [AdminController::class, 'partnerInquiries']);
        Route::patch('/partner-inquiries/{inquiry}/review', [AdminController::class, 'reviewPartnerInquiry']);
    });
});

Route::get('/user', [RegistrationController::class, 'user'])->middleware('auth:sanctum');
Route::get('/shop/products', [ShopController::class, 'products']);
Route::post('/partner-inquiries', [ShopController::class, 'partnerInquiry']);
