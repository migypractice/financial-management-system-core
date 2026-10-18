<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Group 10 Financial Core accepts cross-origin API calls from all partner
    | subsystems (HRMS Groups 1/5/8/9, ESFA Group 3, Supply Chain Group 2,
    | Fleet Group 7, Facilities Group 4) deployed across Vercel, Render,
    | Railway, and localhost, as well as our own Vercel frontend.
    |
    */

    'paths' => ['api/*', 'integrations/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['X-API-KEY', 'Idempotency-Key', 'Authorization', 'Content-Disposition'],

    'max_age' => 86400,

    'supports_credentials' => false,

];
