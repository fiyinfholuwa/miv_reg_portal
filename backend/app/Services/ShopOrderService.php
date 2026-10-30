<?php

namespace App\Services;

use App\Models\ShopOrder;
use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ShopOrderService
{
    public function initialize(User $user, array $items): array
    {
        $quantities = collect($items)->groupBy('product_id')->map(fn ($productItems): int => (int) collect($productItems)->sum('quantity'));
        $products = ShopProduct::query()->where('active', true)->whereIn('id', $quantities->keys())->get()->keyBy('id');

        if ($products->count() !== $quantities->count()) {
            throw ValidationException::withMessages(['items' => ['One or more products are no longer available.']]);
        }

        $total = 0;
        foreach ($quantities as $productId => $quantity) {
            $product = $products->get($productId);
            if ($product->stock !== null && $product->stock < $quantity) {
                throw ValidationException::withMessages(['items' => ["{$product->name} does not have enough stock available."]]);
            }
            $total += $product->price * $quantity;
        }

        $reference = 'JC27-' . Str::upper(Str::random(20));
        $order = DB::transaction(function () use ($user, $reference, $total, $quantities, $products): ShopOrder {
            $order = $user->shopOrders()->create([
                'reference' => $reference,
                'status' => 'pending',
                'total' => $total,
                'currency' => 'NGN',
                'payment_provider' => 'paystack',
            ]);
            foreach ($quantities as $productId => $quantity) {
                $product = $products->get($productId);
                $order->items()->create([
                    'shop_product_id' => $product->id,
                    'name' => $product->name,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'line_total' => $product->price * $quantity,
                ]);
            }
            return $order;
        });

        $secret = (string) config('services.paystack.secret_key');
        if ($secret === '') {
            $order->update(['status' => 'failed']);
            throw ValidationException::withMessages(['payment' => ['Paystack is not configured on the server yet.']]);
        }

        $response = Http::withToken($secret)->acceptJson()->post((string) config('services.paystack.base_url') . '/transaction/initialize', [
            'email' => $user->email,
            'amount' => (string) ($order->total * 100),
            'currency' => $order->currency,
            'reference' => $order->reference,
            'callback_url' => rtrim((string) config('services.frontend_url'), '/') . '/shop/orders/' . urlencode($order->reference) . '?payment=success',
            'metadata' => ['order_id' => $order->id, 'pickup' => 'Store collection at Jan. Conf 2027'],
        ]);

        if (! $response->successful() || ! data_get($response->json(), 'status')) {
            $order->update(['status' => 'failed', 'payment_data' => ['initialize' => $response->json()]]);
            throw ValidationException::withMessages(['payment' => [data_get($response->json(), 'message', 'Paystack could not start the payment.')]]);
        }

        return ['order' => $this->payload($order->load('items')), 'authorization_url' => data_get($response->json(), 'data.authorization_url'), 'reference' => $order->reference];
    }

    public function verify(User $user, string $reference): array
    {
        $order = $user->shopOrders()->where('reference', $reference)->with('items')->firstOrFail();
        if ($order->status === 'paid') return $this->payload($order);

        $response = Http::withToken((string) config('services.paystack.secret_key'))->acceptJson()->get((string) config('services.paystack.base_url') . '/transaction/verify/' . urlencode($reference));
        $payment = $response->json();
        $paymentData = data_get($payment, 'data');
        if (! $response->successful() || ! data_get($payment, 'status') || data_get($paymentData, 'status') !== 'success' || (int) data_get($paymentData, 'amount') !== $order->total * 100) {
            $order->update(['status' => 'failed', 'payment_data' => ['verify' => $payment]]);
            throw ValidationException::withMessages(['payment' => ['Payment could not be verified. No collection code was issued.']]);
        }

        $order->update(['status' => 'paid', 'paid_at' => now(), 'pickup_code' => $order->pickup_code ?: $this->newPickupCode(), 'payment_data' => ['verify' => $payment]]);
        return $this->payload($order->fresh('items'));
    }

    public function orders(User $user): array
    {
        return $user->shopOrders()->with('items')->latest()->get()->map(fn (ShopOrder $order): array => $this->payload($order))->all();
    }

    public function adminOrders(User $admin): array
    {
        return ShopOrder::query()->with(['user:id,name,email', 'items'])->latest()->limit(200)->get()->map(fn (ShopOrder $order): array => [...$this->payload($order), 'user' => ['name' => $order->user?->name, 'email' => $order->user?->email]])->all();
    }

    private function payload(ShopOrder $order): array
    {
        return ['id' => $order->id, 'reference' => $order->reference, 'status' => $order->status, 'total' => $order->total, 'currency' => $order->currency, 'pickup_code' => $order->pickup_code, 'paid_at' => $order->paid_at?->toIso8601String(), 'created_at' => $order->created_at?->toIso8601String(), 'items' => $order->items->map(fn ($item): array => ['name' => $item->name, 'quantity' => $item->quantity, 'unit_price' => $item->unit_price, 'line_total' => $item->line_total])->all()];
    }

    private function newPickupCode(): string
    {
        do { $code = 'JC27-ORD-' . Str::upper(Str::random(8)); } while (ShopOrder::where('pickup_code', $code)->exists());
        return $code;
    }
}
