<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailChangeRequested extends Notification
{
    use Queueable;

    public function __construct(public readonly string $newEmail) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Email change requested')
            ->line("A request was made to change your Balancil account email to {$this->newEmail}.")
            ->line('Your current email remains active until the new address is confirmed.')
            ->line('If you did not make this request, sign in and cancel it from settings.');
    }
}
