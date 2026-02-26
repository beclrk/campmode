import Foundation
import CoreLocation
import SwiftUI

// MARK: - Location Type
enum LocationType: String, Codable, CaseIterable, Hashable {
    case campsite
    case evCharger = "ev_charger"
    case restStop = "rest_stop"

    var label: String {
        switch self {
        case .campsite: return "Campsites"
        case .evCharger: return "EV Chargers"
        case .restStop: return "Rest Stops"
        }
    }

    var singularLabel: String {
        switch self {
        case .campsite: return "Campsite"
        case .evCharger: return "EV Charger"
        case .restStop: return "Rest Stop"
        }
    }

    var systemImage: String {
        switch self {
        case .campsite: return "tent"
        case .evCharger: return "bolt.fill"
        case .restStop: return "cup.and.saucer.fill"
        }
    }

    var color: Color {
        switch self {
        case .campsite: return .green
        case .evCharger: return .blue
        case .restStop: return .orange
        }
    }
}

// MARK: - CampLocation
struct CampLocation: Identifiable, Codable, Hashable, Equatable {
    let id: String
    let name: String
    let type: LocationType
    let lat: Double
    let lng: Double
    let locationDescription: String
    let address: String
    var price: String?
    var priceLevel: Int?
    var facilities: [String]
    var images: [String]
    var website: String?
    var phone: String?
    var googlePlaceId: String?
    var ocmId: Int?
    var rating: Double?
    var reviewCount: Int?
    var openingHoursText: String?
    var createdAt: String?
    var updatedAt: String?

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }

    var clLocation: CLLocation {
        CLLocation(latitude: lat, longitude: lng)
    }

    var qualityScore: Double {
        let r = rating ?? 0
        let rc = Double(reviewCount ?? 0)
        let facilityBonus = 0.1 * Double(facilities.count)
        return r * log10(1.0 + rc) + facilityBonus
    }

    func distanceMiles(from location: CLLocation) -> Double {
        clLocation.distance(from: location) / 1609.344
    }

    func formattedDistance(from location: CLLocation?) -> String? {
        guard let location = location else { return nil }
        let miles = distanceMiles(from: location)
        if miles < 0.1 { return "Nearby" }
        return String(format: "%.1f mi", miles)
    }

    var priceLabelText: String {
        if let price = price, !price.isEmpty { return price }
        guard let level = priceLevel else { return "" }
        if level == 0 { return "Free" }
        return String(repeating: "£", count: min(level, 3))
    }

    var filteredFacilities: [String] {
        let generic = Set(["point_of_interest", "point of interest", "establishment", "premise", "subpremise"])
        return facilities.filter { f in
            let lower = f.lowercased().trimmingCharacters(in: .whitespaces)
            return !lower.isEmpty && !generic.contains(lower) && !generic.contains(lower.replacingOccurrences(of: "_", with: " "))
        }
    }

    enum CodingKeys: String, CodingKey {
        case id, name, type, lat, lng
        case locationDescription = "description"
        case address, price
        case priceLevel = "price_level"
        case facilities, images, website, phone
        case googlePlaceId = "google_place_id"
        case ocmId = "ocm_id"
        case rating
        case reviewCount = "review_count"
        case openingHoursText = "opening_hours"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    static func == (lhs: CampLocation, rhs: CampLocation) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

// MARK: - Review
struct Review: Identifiable, Codable {
    let id: String
    let locationId: String
    let userId: String
    var userName: String?
    let rating: Int
    var comment: String?
    var photos: [String]?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case locationId = "location_id"
        case userId = "user_id"
        case userName = "user_name"
        case rating, comment, photos
        case createdAt = "created_at"
    }

    var formattedDate: String {
        Utils.timeAgo(from: createdAt)
    }
}

// MARK: - Trip
struct Trip: Identifiable, Codable {
    let id: String
    var name: String
    var tripDescription: String?
    var locationIds: [String]
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case tripDescription = "description"
        case locationIds = "locations"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Geocoding Result
struct GeocodingResult: Identifiable, Codable {
    let placeId: Int
    let displayName: String
    let lat: String
    let lon: String

    var id: Int { placeId }

    var coordinate: CLLocationCoordinate2D? {
        guard let la = Double(lat), let lo = Double(lon) else { return nil }
        return CLLocationCoordinate2D(latitude: la, longitude: lo)
    }

    var shortName: String {
        displayName.components(separatedBy: ",").first ?? displayName
    }

    var subtitle: String {
        let parts = displayName.components(separatedBy: ",")
        guard parts.count > 1 else { return "" }
        return parts[1...min(2, parts.count - 1)].joined(separator: ",").trimmingCharacters(in: .whitespaces)
    }

    enum CodingKeys: String, CodingKey {
        case placeId = "place_id"
        case displayName = "display_name"
        case lat, lon
    }
}

// MARK: - MapBounds
struct MapBounds {
    let swLat: Double
    let swLng: Double
    let neLat: Double
    let neLng: Double

    static let uk = MapBounds(swLat: 49.8, swLng: -8.6, neLat: 60.9, neLng: 1.8)

    func contains(_ lat: Double, _ lng: Double) -> Bool {
        lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng
    }

    func clamped() -> MapBounds {
        MapBounds(
            swLat: max(swLat, MapBounds.uk.swLat),
            swLng: max(swLng, MapBounds.uk.swLng),
            neLat: min(neLat, MapBounds.uk.neLat),
            neLng: min(neLng, MapBounds.uk.neLng)
        )
    }
}
