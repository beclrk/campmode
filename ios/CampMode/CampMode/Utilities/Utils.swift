import Foundation

enum Utils {
    static func timeAgo(from dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) ?? ISO8601DateFormatter().date(from: dateString) else { return dateString }
        let diff = Calendar.current.dateComponents([.day, .weekOfYear, .month, .year], from: date, to: Date())
        if let y = diff.year, y > 0 { return "\(y) year\(y == 1 ? "" : "s") ago" }
        if let m = diff.month, m > 0 { return "\(m) month\(m == 1 ? "" : "s") ago" }
        if let w = diff.weekOfYear, w > 0 { return "\(w) week\(w == 1 ? "" : "s") ago" }
        if let d = diff.day, d > 1 { return "\(d) days ago" }
        if let d = diff.day, d == 1 { return "Yesterday" }
        return "Today"
    }

    /// Top 10% per category by quality score
    static func top10PercentIds(from locations: [CampLocation]) -> Set<String> {
        var byType = [LocationType: [CampLocation]]()
        for loc in locations {
            byType[loc.type, default: []].append(loc)
        }
        var ids = Set<String>()
        for (_, list) in byType {
            let sorted = list.sorted { $0.qualityScore > $1.qualityScore }
            let n = max(1, Int(ceil(Double(sorted.count) * 0.1)))
            for i in 0..<min(n, sorted.count) {
                ids.insert(sorted[i].id)
            }
        }
        return ids
    }

    /// IDs with 5+ photos
    static func crownIds(from locations: [CampLocation]) -> Set<String> {
        Set(locations.filter { $0.images.count >= 5 }.map(\.id))
    }
}
