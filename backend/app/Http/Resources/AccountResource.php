<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'type' => $this->type,
            'balance' => (float) $this->balance, 'institution' => $this->institution,
            'color' => $this->color, 'isActive' => $this->is_active,
            'openingBalance' => $this->opening_balance, 'netActivity' => $this->net_activity,
        ];
    }
}
