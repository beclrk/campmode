import SwiftUI

@main
struct CampModeApp: App {
    @StateObject private var authVM = AuthViewModel()
    @StateObject private var savedPlaces = SavedPlacesManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authVM)
                .environmentObject(savedPlaces)
                .preferredColorScheme(.dark)
        }
    }
}
