<?php

namespace App\Http\Resources;

use App\Services\ProfileImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $name = trim($this->name);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'initials' => collect(preg_split('/\s+/', $name))->take(2)
                ->map(fn ($part) => strtoupper(mb_substr($part, 0, 1)))->join(''),
            'currency' => $this->preferences?->currency ?? 'USD',
            'locale' => $this->preferences?->locale ?? 'en-US',
            'timezone' => $this->preferences?->timezone ?? 'UTC',
            'weekStart' => $this->preferences?->week_start ?? 'mon',
            'profileImageUrl' => app(ProfileImageService::class)->url($this->profile_image_path),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
