import Foundation
import SwiftUI

@MainActor
class SavedPlacesManager: ObservableObject {
    @Published var savedPlaces: [CampLocation] = []
    
    private var storageKey: String {
        let userId = UserDefaults.standard.string(forKey: "campmode_user_id") ?? "guest"
        return "campmode_saved_places_\(userId)"
    }
    
    init() { load() }
    
    func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let places = try? JSONDecoder().decode([CampLocation].self, from: data) else {
            savedPlaces = []
            return
        }
        savedPlaces = places
    }
    
    private func save() {
        if let data = try? JSONEncoder().encode(savedPlaces) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
    
    func addSaved(_ location: CampLocation) {
        guard !savedPlaces.contains(where: { $0.id == location.id }) else { return }
        savedPlaces.append(location)
        save()
    }
    
    func removeSaved(_ locationId: String) {
        savedPlaces.removeAll { $0.id == locationId }
        save()
    }
    
    func isSaved(_ locationId: String) -> Bool {
        savedPlaces.contains { $0.id == locationId }
    }
    
    func onUserChange() {
        load()
    }
}
