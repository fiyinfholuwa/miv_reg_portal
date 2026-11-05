<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminOperationsController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProfilePhotoController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\SiteContentController;
use App\Http\Requests\SiteContentRequest;
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
        Route::post('/events/{event}/team', [EventController::class, 'joinTeam']);
        Route::delete('/events/{event}/team', [EventController::class, 'leaveTeam']);
    });
});

Route::prefix('admin')->group(function (): void {
    Route::post('/login', [AdminController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/overview', [AdminController::class, 'overview']);
        Route::get('/registrants', [AdminOperationsController::class, 'registrants']);
        Route::patch('/registrants/review', [AdminOperationsController::class, 'reviewRegistrants']);
        Route::get('/teams', [AdminOperationsController::class, 'teams']);
        Route::post('/teams', [AdminOperationsController::class, 'createTeam']);
        Route::patch('/teams/{team}', [AdminOperationsController::class, 'updateTeam']);
        Route::delete('/teams/{team}', [AdminOperationsController::class, 'deleteTeam']);
        Route::get('/teams/{team}/members', [AdminOperationsController::class, 'teamMembers']);
        Route::post('/teams/{team}/members', [AdminOperationsController::class, 'addTeamMembers']);
        Route::delete('/teams/{team}/members/{registration}', [AdminOperationsController::class, 'removeTeamMember']);
        Route::get('/check-in/lookup', [AdminOperationsController::class, 'checkInLookup']);
        Route::get('/check-in/events/{event}', [AdminOperationsController::class, 'checkInStats']);
        Route::post('/check-in/{registration}', [AdminOperationsController::class, 'checkIn']);
        Route::delete('/check-in/{registration}', [AdminOperationsController::class, 'undoCheckIn']);
        Route::post('/check-in/{registration}/meals', [AdminOperationsController::class, 'serveMeal']);
        Route::post('/shop/orders/collect', [AdminOperationsController::class, 'collectOrder']);
        Route::get('/account', [AdminOperationsController::class, 'account']);
        Route::put('/account', [AdminOperationsController::class, 'updateAccount']);
        Route::put('/account/password', [AdminOperationsController::class, 'updatePassword']);
        Route::post('/account/sign-out-others', [AdminOperationsController::class, 'signOutOthers']);
        Route::post('/admins', [AdminOperationsController::class, 'createAdmin']);
        Route::delete('/admins/{admin}', [AdminOperationsController::class, 'removeAdmin']);
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
        Route::get('/events', [AdminController::class, 'events']);
        Route::post('/events', [AdminController::class, 'createEvent']);
        Route::patch('/events/{event}', [AdminController::class, 'updateEvent']);
        Route::delete('/events/{event}', [AdminController::class, 'deleteEvent']);
        Route::patch('/events/{event}/content', [AdminController::class, 'updateEventContent']);
        Route::put('/site-content/{section}', [SiteContentController::class, 'update'])->whereIn('section', SiteContentRequest::SECTIONS);
        Route::post('/uploads', [AdminController::class, 'upload']);
    });
});

Route::get('/user', [RegistrationController::class, 'user'])->middleware('auth:sanctum');
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);
Route::get('/shop/products', [ShopController::class, 'products']);
Route::get('/site-content', [SiteContentController::class, 'index']);
Route::post('/partner-inquiries', [ShopController::class, 'partnerInquiry']);
Route::middleware('auth:sanctum')->prefix('shop')->group(function (): void {
    Route::get('/cart', [ShopController::class, 'cart']);
    Route::put('/cart', [ShopController::class, 'updateCart']);
    Route::delete('/cart', [ShopController::class, 'clearCart']);
    Route::post('/orders/initialize', [ShopController::class, 'initializeOrder']);
    Route::get('/orders/{reference}/verify', [ShopController::class, 'verifyOrder']);
    Route::get('/orders', [ShopController::class, 'orders']);
});
