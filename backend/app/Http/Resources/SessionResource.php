<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentTokenId = $request->user()?->currentAccessToken()?->getKey();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'ipAddress' => $this->ip_address,
            'userAgent' => $this->user_agent,
            'lastUsedAt' => $this->last_used_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
            'expiresAt' => $this->expires_at?->toISOString(),
            'isCurrent' => $currentTokenId !== null && (string) $this->id === (string) $currentTokenId,
        ];
    }
}
