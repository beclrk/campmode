import Foundation

@MainActor
class TripsViewModel: ObservableObject {
    @Published var trips: [Trip] = []
    @Published var isLoading = false
    
    private var userId: String?
    
    func setUser(_ userId: String?) {
        self.userId = userId
        Task { await loadTrips() }
    }
    
    func loadTrips() async {
        guard let userId = userId else { trips = []; return }
        isLoading = true
        do {
            trips = try await SupabaseClient.shared.fetchTrips(userId: userId)
        } catch {
            print("Failed to load trips: \(error)")
        }
        isLoading = false
    }
    
    func loadTrips(userId: String) async {
        self.userId = userId
        await loadTrips()
    }
    
    func createTrip(name: String) async -> Trip? {
        guard let userId = userId else { return nil }
        do {
            let trip = try await SupabaseClient.shared.createTrip(userId: userId, name: name.isEmpty ? "New trip" : name)
            trips.insert(trip, at: 0)
            return trip
        } catch {
            print("Failed to create trip: \(error)")
            return nil
        }
    }
    
    func addLocation(_ locationId: String, toTrip tripId: String) async -> Bool {
        guard let userId = userId,
              let trip = trips.first(where: { $0.id == tripId }),
              !trip.locationIds.contains(locationId) else { return false }
        
        let newIds = trip.locationIds + [locationId]
        do {
            try await SupabaseClient.shared.updateTrip(tripId: tripId, userId: userId, locationIds: newIds)
            if let idx = trips.firstIndex(where: { $0.id == tripId }) {
                trips[idx].locationIds = newIds
            }
            return true
        } catch {
            print("Failed to add location to trip: \(error)")
            return false
        }
    }
    
    func updateTrip(id: String, name: String, locationIds: [String]) async -> Bool {
        guard let userId = userId else { return false }
        do {
            try await SupabaseClient.shared.updateTrip(tripId: id, userId: userId, locationIds: locationIds)
            if let idx = trips.firstIndex(where: { $0.id == id }) {
                trips[idx].locationIds = locationIds
                trips[idx].name = name
            }
            return true
        } catch {
            print("Failed to update trip: \(error)")
            return false
        }
    }
    
    func deleteTrip(_ tripId: String) async {
        guard let userId = userId else { return }
        do {
            try await SupabaseClient.shared.deleteTrip(tripId: tripId, userId: userId)
            trips.removeAll { $0.id == tripId }
        } catch {
            print("Failed to delete trip: \(error)")
        }
    }
    
    func loadTripLocations(_ trip: Trip) async -> [CampLocation] {
        guard !trip.locationIds.isEmpty else { return [] }
        do {
            return try await SupabaseClient.shared.fetchLocationsByIds(trip.locationIds)
        } catch {
            return []
        }
    }
}
