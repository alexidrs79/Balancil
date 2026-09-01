<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmailChangeRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->new_email,
            'expiresAt' => $this->expires_at->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
