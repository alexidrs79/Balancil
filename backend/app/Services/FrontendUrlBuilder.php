<?php

namespace App\Services;

class FrontendUrlBuilder
{
    public function emailChangeConfirmation(string $token): string
    {
        $frontend = rtrim((string) config('app.frontend_url'), '/');

        return $frontend.'/confirm-email-change?token='.urlencode($token);
    }
}
