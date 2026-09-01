<?php

namespace App\Notifications;

use App\Services\FrontendUrlBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ConfirmEmailChange extends Notification
{
    use Queueable;

    public function __construct(public readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = app(FrontendUrlBuilder::class)->emailChangeConfirmation($this->token);

        return (new MailMessage)
            ->subject('Confirm your new email address')
            ->line('Confirm this address to finish changing the email on your Balancil account.')
            ->action('Confirm email address', $url)
            ->line('This link expires in one hour.');
    }
}
