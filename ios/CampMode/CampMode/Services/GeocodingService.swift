import Foundation

actor GeocodingService {
    static let shared = GeocodingService()
    
    func search(query: String) async throws -> [GeocodingResult] {
        guard query.count > 2 else { return [] }
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let urlString = "https://nominatim.openstreetmap.org/search?format=json&q=\(encoded)&countrycodes=gb&limit=5"
        guard let url = URL(string: urlString) else { return [] }
        
        var request = URLRequest(url: url)
        request.setValue("CampMode-iOS/2.0", forHTTPHeaderField: "User-Agent")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([GeocodingResult].self, from: data)
    }
}
