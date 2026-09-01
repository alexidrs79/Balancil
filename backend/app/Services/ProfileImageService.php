<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class ProfileImageService
{
    public const DISK = 'local';

    private const LEGACY_DISK = 'public';

    public const DIRECTORY = 'profile-images';

    public const MAX_KILOBYTES = 2048;

    public const MAX_WIDTH = 4096;

    public const MAX_HEIGHT = 4096;

    public const ALLOWED_IMAGE_TYPES = [
        IMAGETYPE_JPEG,
        IMAGETYPE_PNG,
        IMAGETYPE_WEBP,
    ];

    public function store(User $user, UploadedFile $file): User
    {
        $info = getimagesize($file->getRealPath());
        $extension = match ($info[2] ?? null) {
            IMAGETYPE_JPEG => 'jpg',
            IMAGETYPE_PNG => 'png',
            IMAGETYPE_WEBP => 'webp',
            default => 'jpg',
        };

        $path = $file->storeAs(
            $this->userDirectory($user),
            Str::uuid()->toString().'.'.$extension,
            self::DISK,
        );

        $previous = $user->profile_image_path;
        $user->forceFill(['profile_image_path' => $path])->save();
        $this->deleteOwnedFile($user, $previous);

        return $user->refresh()->load('preferences');
    }

    public function remove(User $user): User
    {
        $this->deleteStored($user);
        $user->forceFill(['profile_image_path' => null])->save();

        return $user->refresh()->load('preferences');
    }

    public function deleteStored(User $user): void
    {
        $this->deleteOwnedFile($user, $user->profile_image_path);
        Storage::disk(self::DISK)->deleteDirectory($this->userDirectory($user));
        Storage::disk(self::LEGACY_DISK)->deleteDirectory($this->userDirectory($user));
    }

    public function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (! Storage::disk(self::DISK)->exists($path) && Storage::disk(self::LEGACY_DISK)->exists($path)) {
            Storage::disk(self::DISK)->put($path, Storage::disk(self::LEGACY_DISK)->get($path));
            Storage::disk(self::LEGACY_DISK)->delete($path);
        }

        [$directory, $userId, $filename] = array_pad(explode('/', $path, 3), 3, null);
        if ($directory !== self::DIRECTORY || ! $userId || ! $filename) {
            return null;
        }

        return URL::temporarySignedRoute(
            'profile-images.show',
            now()->addHour(),
            ['user' => $userId, 'filename' => $filename],
        );
    }

    private function userDirectory(User $user): string
    {
        return self::DIRECTORY.'/'.$user->id;
    }

    private function deleteOwnedFile(User $user, ?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        $prefix = $this->userDirectory($user).'/';
        if (! str_starts_with($path, $prefix) || str_contains($path, '..')) {
            return;
        }

        Storage::disk(self::DISK)->delete($path);
        Storage::disk(self::LEGACY_DISK)->delete($path);
    }
}
