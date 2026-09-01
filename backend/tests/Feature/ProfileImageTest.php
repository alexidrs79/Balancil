<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProfileImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_upload_a_profile_image(): void
    {
        Storage::fake(ProfileImageService::DISK);
        $user = $this->user();
        Sanctum::actingAs($user);

        $response = $this->upload(UploadedFile::fake()->image('My Photo.JPG', 120, 80));

        $response->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.profileImageUrl', fn ($url) => is_string($url) && $url !== '');

        $url = $response->json('user.profileImageUrl');
        $this->assertMatchesRegularExpression('#^https?://#', $url);
        $this->assertStringContainsString('/api/profile-images/'.$user->id.'/', $url);
        $this->assertStringContainsString('signature=', $url);
        $this->assertStringNotContainsString('My Photo', $url);
        $this->assertStringNotContainsString('My%20Photo', $url);

        $path = $user->refresh()->profile_image_path;
        $this->assertNotNull($path);
        $this->assertStringStartsWith('profile-images/'.$user->id.'/', $path);
        $this->assertStringNotContainsString('My Photo', $path);
        Storage::disk(ProfileImageService::DISK)->assertExists($path);
        $imageResponse = $this->get($url)->assertOk();
        $this->assertStringContainsString(
            'private',
            (string) $imageResponse->headers->get('Cache-Control'),
        );

        $this->get(preg_replace('/signature=[^&]+/', 'signature=invalid', $url))
            ->assertForbidden();
    }

    public function test_replacing_a_profile_image_deletes_the_previous_file(): void
    {
        Storage::fake(ProfileImageService::DISK);
        $user = $this->user();
        Sanctum::actingAs($user);

        $this->upload(UploadedFile::fake()->image('first.png', 64, 64))->assertOk();
        $firstPath = $user->refresh()->profile_image_path;
        Storage::disk(ProfileImageService::DISK)->assertExists($firstPath);

        $this->upload(UploadedFile::fake()->image('second.jpg', 80, 80))->assertOk();
        $secondPath = $user->refresh()->profile_image_path;

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk(ProfileImageService::DISK)->assertMissing($firstPath);
        Storage::disk(ProfileImageService::DISK)->assertExists($secondPath);
        $this->assertCount(1, Storage::disk(ProfileImageService::DISK)->allFiles('profile-images/'.$user->id));
    }

    public function test_upload_rejects_non_images_oversize_and_unreasonable_dimensions(): void
    {
        Storage::fake(ProfileImageService::DISK);
        Sanctum::actingAs($this->user());

        $this->upload(UploadedFile::fake()->createWithContent('avatar.jpg', 'not-an-image'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');

        $this->upload(UploadedFile::fake()->image('avatar.gif', 40, 40))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');

        $this->upload(UploadedFile::fake()->image('avatar.jpg', 80, 80)->size(ProfileImageService::MAX_KILOBYTES + 1))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');

        $this->upload(UploadedFile::fake()->image(
            'huge.jpg',
            ProfileImageService::MAX_WIDTH + 1,
            100,
        ))->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->post('/api/settings/profile-image', [], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');

        $this->assertNull(User::query()->value('profile_image_path'));
    }

    public function test_removing_a_profile_image_deletes_the_stored_file(): void
    {
        Storage::fake(ProfileImageService::DISK);
        $user = $this->user();
        Sanctum::actingAs($user);

        $this->upload(UploadedFile::fake()->image('avatar.jpg', 50, 50))->assertOk();
        $path = $user->refresh()->profile_image_path;
        Storage::disk(ProfileImageService::DISK)->assertExists($path);

        $this->deleteJson('/api/settings/profile-image')
            ->assertOk()
            ->assertJsonPath('user.profileImageUrl', null);

        $this->assertNull($user->refresh()->profile_image_path);
        Storage::disk(ProfileImageService::DISK)->assertMissing($path);
        $this->assertSame([], Storage::disk(ProfileImageService::DISK)->allFiles('profile-images/'.$user->id));
    }

    public function test_account_deletion_deletes_the_stored_profile_image(): void
    {
        Storage::fake(ProfileImageService::DISK);
        $user = $this->user(['password' => 'secret-pass']);
        Sanctum::actingAs($user);

        $this->upload(UploadedFile::fake()->image('avatar.jpg', 40, 40))->assertOk();
        $path = $user->refresh()->profile_image_path;
        $directory = 'profile-images/'.$user->id;
        Storage::disk(ProfileImageService::DISK)->assertExists($path);

        $this->deleteJson('/api/me', ['password' => 'secret-pass'])->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        Storage::disk(ProfileImageService::DISK)->assertMissing($path);
        $this->assertSame([], Storage::disk(ProfileImageService::DISK)->allFiles($directory));
    }

    public function test_user_resource_exposes_nullable_profile_image_url(): void
    {
        Storage::fake(ProfileImageService::DISK);
        $user = $this->user();
        Sanctum::actingAs($user);

        $this->getJson('/api/me')->assertOk()->assertJsonPath('profileImageUrl', null);
        $this->getJson('/api/settings')->assertOk()->assertJsonPath('user.profileImageUrl', null);

        $this->upload(UploadedFile::fake()->image('avatar.png', 32, 32))->assertOk();
        $url = $user->refresh()->profile_image_path;
        $expected = app(ProfileImageService::class)->url($url);

        $this->getJson('/api/me')->assertOk()->assertJsonPath('profileImageUrl', $expected);
        $this->getJson('/api/settings')->assertOk()->assertJsonPath('user.profileImageUrl', $expected);
    }

    public function test_profile_images_stay_isolated_per_user(): void
    {
        Storage::fake(ProfileImageService::DISK);
        $owner = $this->user();
        $stranger = $this->user();
        Sanctum::actingAs($owner);
        $this->upload(UploadedFile::fake()->image('owner.jpg', 40, 40))->assertOk();
        $ownerPath = $owner->refresh()->profile_image_path;

        Sanctum::actingAs($stranger);
        $this->getJson('/api/me')->assertOk()->assertJsonPath('profileImageUrl', null);
        $this->deleteJson('/api/settings/profile-image')->assertOk();
        Storage::disk(ProfileImageService::DISK)->assertExists($ownerPath);
        $this->assertNotNull($owner->refresh()->profile_image_path);

        $this->upload(UploadedFile::fake()->image('stranger.jpg', 40, 40))->assertOk();
        $this->assertNotSame($ownerPath, $stranger->refresh()->profile_image_path);
        Storage::disk(ProfileImageService::DISK)->assertExists($ownerPath);
        $this->assertStringContainsString($owner->id, $ownerPath);
        $this->assertStringContainsString($stranger->id, $stranger->profile_image_path);
    }

    public function test_guests_cannot_upload_or_remove_profile_images(): void
    {
        $this->post('/api/settings/profile-image', [
            'image' => UploadedFile::fake()->image('avatar.jpg', 20, 20),
        ], ['Accept' => 'application/json'])->assertUnauthorized();
        $this->deleteJson('/api/settings/profile-image')->assertUnauthorized();
    }

    private function user(array $overrides = []): User
    {
        $user = User::factory()->create($overrides);
        $user->preferences()->create();

        return $user;
    }

    private function upload(UploadedFile $file)
    {
        return $this->post('/api/settings/profile-image', [
            'image' => $file,
        ], ['Accept' => 'application/json']);
    }
}
