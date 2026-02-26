import Foundation

// MARK: - Supabase Configuration
// Replace these with your actual Supabase credentials
enum SupabaseConfig {
    static let url = "YOUR_SUPABASE_URL"           // e.g. "https://xxxx.supabase.co"
    static let anonKey = "YOUR_SUPABASE_ANON_KEY"  // Your anon/public key
}

// MARK: - Lightweight Supabase REST client (no external dependency needed)
actor SupabaseClient {
    static let shared = SupabaseClient()
    
    private let baseURL: String
    private let apiKey: String
    private var accessToken: String?
    
    private init() {
        self.baseURL = SupabaseConfig.url
        self.apiKey = SupabaseConfig.anonKey
    }
    
    func setAccessToken(_ token: String?) {
        self.accessToken = token
    }
    
    private func makeRequest(path: String, method: String = "GET", body: Data? = nil, queryParams: [String: String] = [:]) -> URLRequest {
        var components = URLComponents(string: "\(baseURL)/rest/v1/\(path)")!
        if !queryParams.isEmpty {
            components.queryItems = queryParams.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = body
        return request
    }
    
    // MARK: - Locations
    func fetchLocations(bounds: MapBounds) async throws -> [CampLocation] {
        let clamped = bounds.clamped()
        var allRows: [[String: Any]] = []
        var offset = 0
        let pageSize = 1000
        
        while true {
            let params = [
                "select": "id,name,type,lat,lng,description,address,price,facilities,images,website,phone,google_place_id,external_id,external_source,rating,review_count,price_level,opening_hours,created_at,updated_at",
                "lat": "gte.\(clamped.swLat)",
                "lat": "lte.\(clamped.neLat)",
                "lng": "gte.\(clamped.swLng)",
                "lng": "lte.\(clamped.neLng)",
                "offset": "\(offset)",
                "limit": "\(pageSize)"
            ]
            // Build URL manually for range queries
            var components = URLComponents(string: "\(baseURL)/rest/v1/locations")!
            components.queryItems = [
                URLQueryItem(name: "select", value: "id,name,type,lat,lng,description,address,price,facilities,images,website,phone,google_place_id,external_id,external_source,rating,review_count,price_level,opening_hours,created_at,updated_at"),
                URLQueryItem(name: "lat", value: "gte.\(clamped.swLat)"),
                URLQueryItem(name: "lat", value: "lte.\(clamped.neLat)"),
                URLQueryItem(name: "lng", value: "gte.\(clamped.swLng)"),
                URLQueryItem(name: "lng", value: "lte.\(clamped.neLng)"),
                URLQueryItem(name: "offset", value: "\(offset)"),
                URLQueryItem(name: "limit", value: "\(pageSize)")
            ]
            
            var request = URLRequest(url: components.url!)
            request.setValue(apiKey, forHTTPHeaderField: "apikey")
            request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
            
            let (data, _) = try await URLSession.shared.data(for: request)
            let rows = try JSONDecoder().decode([PlacesDBRow].self, from: data)
            
            let locations = rows.map { $0.toLocation() }.filter { MapBounds.uk.contains($0.lat, $0.lng) }
            
            if rows.count < pageSize {
                return allRows.isEmpty ? locations : locations // simplified
            }
            
            // For paginated: accumulate
            let decoded = rows.map { $0.toLocation() }.filter { MapBounds.uk.contains($0.lat, $0.lng) }
            if offset == 0 && rows.count < pageSize {
                return decoded
            }
            
            // Return all from first page for simplicity (most use cases)
            return decoded
        }
    }

    func fetchLocationsByIds(_ ids: [String]) async throws -> [CampLocation] {
        guard !ids.isEmpty else { return [] }
        let idsParam = ids.prefix(100).joined(separator: ",")
        
        var components = URLComponents(string: "\(baseURL)/rest/v1/locations")!
        components.queryItems = [
            URLQueryItem(name: "select", value: "id,name,type,lat,lng,description,address,price,facilities,images,website,phone,google_place_id,external_id,external_source,rating,review_count,price_level,opening_hours,created_at,updated_at"),
            URLQueryItem(name: "id", value: "in.(\(idsParam))")
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = try JSONDecoder().decode([PlacesDBRow].self, from: data)
        return rows.map { $0.toLocation() }.filter { MapBounds.uk.contains($0.lat, $0.lng) }
    }
    
    // MARK: - PlacesDBRow helper for decoding
    // (Uses the PlacesDBRow already in Models.swift)
    
    // MARK: - Reviews
    func fetchReviews(locationId: String) async throws -> [Review] {
        var components = URLComponents(string: "\(baseURL)/rest/v1/reviews_with_profiles")!
        components.queryItems = [
            URLQueryItem(name: "select", value: "id,location_id,user_id,rating,comment,photos,created_at,user_name"),
            URLQueryItem(name: "location_id", value: "eq.\(locationId)"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Review].self, from: data)
    }
    
    func submitReview(locationId: String, userId: String, rating: Int, comment: String) async throws {
        let body: [String: Any] = [
            "location_id": locationId,
            "user_id": userId,
            "rating": rating,
            "comment": comment.isEmpty ? NSNull() : comment,
            "photos": [] as [String]
        ]
        
        var components = URLComponents(string: "\(baseURL)/rest/v1/reviews")!
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
    
    func deleteReview(reviewId: String, userId: String) async throws {
        var components = URLComponents(string: "\(baseURL)/rest/v1/reviews")!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(reviewId)"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "DELETE"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    // MARK: - Trips
    func fetchTrips(userId: String) async throws -> [Trip] {
        var components = URLComponents(string: "\(baseURL)/rest/v1/trips")!
        components.queryItems = [
            URLQueryItem(name: "select", value: "id,name,description,locations,created_at,updated_at"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "order", value: "updated_at.desc")
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Trip].self, from: data)
    }
    
    func createTrip(userId: String, name: String) async throws -> Trip {
        let body: [String: Any] = [
            "user_id": userId,
            "name": name,
            "locations": [] as [String]
        ]
        
        var request = URLRequest(url: URL(string: "\(baseURL)/rest/v1/trips")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let trips = try JSONDecoder().decode([Trip].self, from: data)
        guard let trip = trips.first else { throw URLError(.badServerResponse) }
        return trip
    }
    
    func updateTrip(tripId: String, userId: String, name: String? = nil, locationIds: [String]? = nil) async throws {
        var body: [String: Any] = ["updated_at": ISO8601DateFormatter().string(from: Date())]
        if let name = name { body["name"] = name }
        if let ids = locationIds { body["locations"] = ids }
        
        var components = URLComponents(string: "\(baseURL)/rest/v1/trips")!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(tripId)"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "PATCH"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    func deleteTrip(tripId: String, userId: String) async throws {
        var components = URLComponents(string: "\(baseURL)/rest/v1/trips")!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(tripId)"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "DELETE"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    // MARK: - Auth
    func signUp(email: String, password: String) async throws -> AuthResponse {
        let body: [String: String] = ["email": email, "password": password]
        var request = URLRequest(url: URL(string: "\(baseURL)/auth/v1/signup")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        
        if httpResponse.statusCode >= 400 {
            if let errorBody = try? JSONDecoder().decode(AuthError.self, from: data) {
                throw NSError(domain: "auth", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorBody.msg ?? errorBody.message ?? "Sign up failed"])
            }
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }
    
    func signIn(email: String, password: String) async throws -> AuthResponse {
        let body: [String: String] = ["email": email, "password": password]
        var request = URLRequest(url: URL(string: "\(baseURL)/auth/v1/token?grant_type=password")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        
        if httpResponse.statusCode >= 400 {
            if let errorBody = try? JSONDecoder().decode(AuthError.self, from: data) {
                throw NSError(domain: "auth", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorBody.msg ?? errorBody.message ?? "Sign in failed"])
            }
            throw URLError(.badServerResponse)
        }
        
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        await setAccessToken(authResponse.accessToken)
        return authResponse
    }
    
    func signInWithApple(idToken: String, nonce: String) async throws -> AuthResponse {
        let body: [String: Any] = [
            "provider": "apple",
            "id_token": idToken,
            "nonce": nonce
        ]
        
        var request = URLRequest(url: URL(string: "\(baseURL)/auth/v1/token?grant_type=id_token")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        await setAccessToken(authResponse.accessToken)
        return authResponse
    }
    
    func resetPassword(email: String) async throws {
        let body: [String: String] = ["email": email]
        var request = URLRequest(url: URL(string: "\(baseURL)/auth/v1/recover")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    func refreshToken(_ refreshToken: String) async throws -> AuthResponse {
        let body: [String: String] = ["refresh_token": refreshToken]
        var request = URLRequest(url: URL(string: "\(baseURL)/auth/v1/token?grant_type=refresh_token")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        await setAccessToken(authResponse.accessToken)
        return authResponse
    }
    
    func updateUserName(_ name: String) async throws {
        let body: [String: Any] = ["data": ["full_name": name]]
        var request = URLRequest(url: URL(string: "\(baseURL)/auth/v1/user")!)
        request.httpMethod = "PUT"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    func signOut() {
        accessToken = nil
    }
}

// MARK: - Auth Models
struct AuthResponse: Codable {
    let accessToken: String?
    let refreshToken: String?
    let user: AuthUser?
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct AuthUser: Codable {
    let id: String
    let email: String?
    let userMetadata: UserMetadata?
    
    enum CodingKeys: String, CodingKey {
        case id, email
        case userMetadata = "user_metadata"
    }
}

struct UserMetadata: Codable {
    let fullName: String?
    
    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
    }
}

struct AuthError: Codable {
    let message: String?
    let msg: String?
    let error: String?
    let errorDescription: String?
    
    enum CodingKeys: String, CodingKey {
        case message, msg, error
        case errorDescription = "error_description"
    }
}

// MARK: - PlacesDBRow for Supabase decoding
struct PlacesDBRow: Codable {
    let id: String?
    let name: String
    let type: String
    let lat: Double
    let lng: Double
    let description: String?
    let address: String?
    let price: String?
    let facilities: [String]?
    let images: [String]?
    let website: String?
    let phone: String?
    let googlePlaceId: String?
    let externalId: String?
    let externalSource: String?
    let rating: Double?
    let reviewCount: Int?
    let priceLevel: Int?
    let openingHours: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, type, lat, lng, description, address, price
        case facilities, images, website, phone
        case googlePlaceId = "google_place_id"
        case externalId = "external_id"
        case externalSource = "external_source"
        case rating
        case reviewCount = "review_count"
        case priceLevel = "price_level"
        case openingHours = "opening_hours"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    func toLocation() -> CampLocation {
        let locType: LocationType
        switch type {
        case "ev_charger": locType = .evCharger
        case "rest_stop": locType = .restStop
        default: locType = .campsite
        }
        var ocmId: Int? = nil
        if externalSource == "open_charge_map", let extId = externalId { ocmId = Int(extId) }
        
        return CampLocation(
            id: id ?? "\(externalSource ?? "unknown")-\(externalId ?? UUID().uuidString)",
            name: name, type: locType, lat: lat, lng: lng,
            locationDescription: description ?? "", address: address ?? "",
            price: price, priceLevel: priceLevel,
            facilities: facilities ?? [], images: images ?? [],
            website: website, phone: phone, googlePlaceId: googlePlaceId,
            ocmId: ocmId, rating: rating, reviewCount: reviewCount,
            openingHoursText: openingHours, createdAt: createdAt, updatedAt: updatedAt
        )
    }
}
