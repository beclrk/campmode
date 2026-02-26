import Foundation
import CoreLocation
import MapKit
import SwiftUI

@MainActor
class MapViewModel: ObservableObject {
    @Published var locations: [CampLocation] = []
    @Published var filteredLocations: [CampLocation] = []
    @Published var selectedTypes: Set<LocationType> = [.campsite]
    @Published var searchQuery = ""
    @Published var selectedLocation: CampLocation?
    @Published var isLoading = false
    @Published var viewMode: ViewMode = .map
    @Published var routeStops: [CampLocation] = []
    @Published var showRoutePlanner = false
    @Published var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 54.5, longitude: -2.5),
        span: MKCoordinateSpan(latitudeDelta: 10, longitudeDelta: 10)
    )
    
    enum ViewMode { case map, list }
    enum SortMode { case quality, distance }
    @Published var listSortMode: SortMode = .quality
    
    var top10Ids: Set<String> { Utils.top10PercentIds(from: filteredLocations) }
    var crownIds: Set<String> { Utils.crownIds(from: filteredLocations) }
    
    var counts: [LocationType: Int] {
        var result = [LocationType: Int]()
        for type in LocationType.allCases {
            result[type] = locations.filter { $0.type == type }.count
        }
        return result
    }
    
    func loadLocations() async {
        isLoading = true
        do {
            let bounds = MapBounds.uk
            let locs = try await SupabaseClient.shared.fetchLocations(bounds: bounds)
            self.locations = locs
            applyFilters()
        } catch {
            print("Failed to load locations: \(error)")
        }
        isLoading = false
    }
    
    func toggleType(_ type: LocationType) {
        if selectedTypes.contains(type) {
            selectedTypes.remove(type)
        } else {
            selectedTypes.insert(type)
        }
        applyFilters()
    }
    
    func applyFilters() {
        var result = locations.filter { selectedTypes.contains($0.type) }
        
        // Cap EV chargers when all 3 types selected
        if selectedTypes.count == 3 {
            let campsites = result.filter { $0.type == .campsite }
            let restStops = result.filter { $0.type == .restStop }
            let evChargers = result.filter { $0.type == .evCharger }
            let cappedEV = Array(evChargers.prefix(300))
            result = campsites + restStops + cappedEV
        }
        
        if !searchQuery.isEmpty {
            let q = searchQuery.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(q) ||
                $0.locationDescription.lowercased().contains(q) ||
                $0.address.lowercased().contains(q)
            }
        }
        
        filteredLocations = result
    }
    
    func sortedForList(userLocation: CLLocation?) -> [CampLocation] {
        if listSortMode == .distance, let loc = userLocation {
            return filteredLocations.sorted { $0.clLocation.distance(from: loc) < $1.clLocation.distance(from: loc) }
        }
        return filteredLocations.sorted { $0.qualityScore > $1.qualityScore }
    }
    
    // MARK: - Route
    func addToRoute(_ location: CampLocation) {
        guard !routeStops.contains(where: { $0.id == location.id }) else { return }
        routeStops.append(location)
        showRoutePlanner = true
    }
    
    func removeFromRoute(_ location: CampLocation) {
        routeStops.removeAll { $0.id == location.id }
    }
    
    func removeStop(at index: Int) {
        guard routeStops.indices.contains(index) else { return }
        routeStops.remove(at: index)
    }
    
    func moveStop(from source: IndexSet, to destination: Int) {
        routeStops.move(fromOffsets: source, toOffset: destination)
    }
    
    func isInRoute(_ location: CampLocation) -> Bool {
        routeStops.contains { $0.id == location.id }
    }
    
    func centerOnLocation(_ location: CampLocation) {
        mapRegion = MKCoordinateRegion(
            center: location.coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
        )
    }
}
