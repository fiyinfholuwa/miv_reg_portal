<?php

namespace App\Providers;

use App\Services\Push\PushSender;
use App\Services\Push\WebPushSender;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PushSender::class, WebPushSender::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
