<?php

namespace App\Http\Requests;

use App\Rules\RealProfileImage;
use App\Services\ProfileImageService;
use Illuminate\Foundation\Http\FormRequest;

class StoreProfileImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',
                'max:'.ProfileImageService::MAX_KILOBYTES,
                'mimes:jpeg,jpg,png,webp',
                'dimensions:max_width='.ProfileImageService::MAX_WIDTH.',max_height='.ProfileImageService::MAX_HEIGHT,
                new RealProfileImage(ProfileImageService::ALLOWED_IMAGE_TYPES),
            ],
        ];
    }
}
