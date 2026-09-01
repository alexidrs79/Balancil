<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_application_health_endpoint_succeeds(): void
    {
        $this->get('/up')->assertOk();
        $this->getJson('/')->assertOk()->assertJsonPath('ok', true);
    }
}
