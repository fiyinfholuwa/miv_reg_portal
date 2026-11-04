<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProfilePhotoController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\ShopController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/start', [RegistrationController::class, 'start']);
    Route::post('/login', [RegistrationController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/register', [RegistrationController::class, 'register'])->middleware('throttle:6,1');
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
        Route::get('/events', [EventController::class, 'myEvents']);
        Route::get('/photo', [ProfilePhotoController::class, 'show']);
        Route::post('/photo', [ProfilePhotoController::class, 'store']);
        Route::delete('/photo', [ProfilePhotoController::class, 'destroy']);
        Route::post('/events/{event}/register', [EventController::class, 'register']);
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
        Route::get('/shop/orders', [AdminController::class, 'shopOrders']);
    });
});

Route::get('/user', [RegistrationController::class, 'user'])->middleware('auth:sanctum');
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);
Route::get('/shop/products', [ShopController::class, 'products']);
Route::post('/partner-inquiries', [ShopController::class, 'partnerInquiry']);
Route::middleware('auth:sanctum')->prefix('shop')->group(function (): void {
    Route::get('/cart', [ShopController::class, 'cart']);
    Route::put('/cart', [ShopController::class, 'updateCart']);
    Route::delete('/cart', [ShopController::class, 'clearCart']);
    Route::post('/orders/initialize', [ShopController::class, 'initializeOrder']);
    Route::get('/orders/{reference}/verify', [ShopController::class, 'verifyOrder']);
    Route::get('/orders', [ShopController::class, 'orders']);
});
