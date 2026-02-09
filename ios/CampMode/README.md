# CampMode iOS

Native iOS app for discovering campsites, EV chargers, and rest stops across the UK.

## Requirements

- Xcode 15+
- iOS 17.0+
- Apple Developer Account (for Sign in with Apple + App Store)

## Setup

### 1. Open in Xcode
Double-click `CampMode.xcodeproj` to open in Xcode.

### 2. Add your Supabase credentials
Open `CampMode/Services/SupabaseService.swift` and replace the placeholder values:

```swift
private let baseURL = "https://YOUR_PROJECT.supabase.co"
private let anonKey = "YOUR_ANON_KEY"
```

### 3. Configure Signing
1. Select the CampMode target in Xcode
2. Go to **Signing & Capabilities**
3. Select your **Team**
4. Update **Bundle Identifier** if needed (default: `app.campmode.ios`)

### 4. Enable Sign in with Apple
1. In **Signing & Capabilities**, click **+ Capability**
2. Add **Sign in with Apple**
3. Configure the capability in your Apple Developer account

### 5. Add App Icon
Replace `CampMode/Assets.xcassets/AppIcon.appiconset/AppIcon.png` with your 1024x1024 app icon.

### 6. Build & Run
Select an iPhone simulator or connected device and press ⌘R.

## Architecture

- **SwiftUI** - All UI built with SwiftUI
- **MapKit** - Native Apple Maps with custom annotations
- **No external dependencies** - Custom Supabase REST client using URLSession
- **MVVM** - Clean ViewModel architecture
- **Dark mode only** - Matches web app design

## Features

- 🗺️ Interactive map with campsite/EV/rest stop markers
- 🔍 Location search via Nominatim geocoding
- 📍 GPS "Use my location" support
- ⭐ Quality scoring with gold star (top 10%) and crown (5+ photos) badges
- 📋 List view with sort by quality or distance
- 🔖 Save places (local storage)
- 🛣️ Route planner with Apple Maps / Google Maps navigation
- 📁 Trip management (Supabase)
- 👤 Auth: Email/password + Sign in with Apple
- ⚙️ Settings with account management
- 📝 Reviews with star ratings

## Project Structure

```
CampMode/
├── CampModeApp.swift          # App entry point
├── Models/Models.swift         # Data models
├── Services/
│   ├── SupabaseService.swift   # REST API client
│   ├── LocationManager.swift   # CoreLocation
│   └── GeocodingService.swift  # Nominatim search
├── ViewModels/
│   ├── AuthViewModel.swift     # Authentication
│   ├── MapViewModel.swift      # Map state & filters
│   ├── SavedPlacesManager.swift# Local saved places
│   ├── TripsViewModel.swift    # Trip CRUD
│   └── ReviewsViewModel.swift  # Review CRUD
├── Views/
│   ├── ContentView.swift       # Root navigation
│   ├── HomeView.swift          # Main screen
│   ├── LoginView.swift         # Auth screens
│   ├── LocationListView.swift  # List view
│   ├── SavedPlacesView.swift   # Saved locations
│   ├── TripsView.swift         # Trip management
│   ├── SettingsView.swift      # Settings
│   └── Components/
│       ├── CampMapView.swift         # MapKit view
│       ├── FilterPillsView.swift     # Type filter pills
│       ├── LocationDetailSheet.swift # Location detail
│       ├── RoutePlannerSheet.swift   # Route planner
│       └── AddToTripSheet.swift      # Add to trip modal
├── Utilities/Utils.swift       # Helper functions
├── Assets.xcassets/            # App icon, colors
├── Info.plist                  # App configuration
└── CampMode.entitlements       # Sign in with Apple
```
