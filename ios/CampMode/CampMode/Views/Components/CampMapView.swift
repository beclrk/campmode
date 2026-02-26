import SwiftUI
import MapKit

struct CampMapView: View {
    let locations: [CampLocation]
    @Binding var selectedLocation: CampLocation?
    @Binding var region: MKCoordinateRegion
    var userLocation: CLLocationCoordinate2D?
    var routeStops: [CampLocation]
    var top10Ids: Set<String>
    var crownIds: Set<String>
    
    var body: some View {
        Map(coordinateRegion: $region, showsUserLocation: userLocation != nil, annotationItems: locations) { location in
            MapAnnotation(coordinate: location.coordinate) {
                markerView(for: location)
                    .onTapGesture {
                        selectedLocation = location
                    }
            }
        }
        .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
        .overlay(routeOverlay)
    }
    
    @ViewBuilder
    private func markerView(for location: CampLocation) -> some View {
        let isSelected = selectedLocation?.id == location.id
        let isTop10 = top10Ids.contains(location.id)
        let isCrown = crownIds.contains(location.id)
        let size: CGFloat = isSelected ? 44 : 36
        
        ZStack {
            Circle()
                .fill(isSelected ? location.type.color : Color(white: 0.06))
                .frame(width: size, height: size)
                .overlay(Circle().stroke(location.type.color, lineWidth: 3))
                .shadow(color: .black.opacity(0.4), radius: 4)
            
            Image(systemName: location.type.systemImage)
                .font(.system(size: isSelected ? 18 : 14))
                .foregroundColor(isSelected ? .white : location.type.color)
            
            // Gold star badge (top 10%)
            if isTop10 {
                Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.white)
                    .frame(width: 18, height: 18)
                    .background(
                        LinearGradient(colors: [.yellow, .orange], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.yellow.opacity(0.3), lineWidth: 1))
                    .offset(x: -(size/2 - 2), y: -(size/2 - 2))
            }
            
            // Crown badge (5+ photos)
            if isCrown {
                Image(systemName: "crown.fill")
                    .font(.system(size: 9))
                    .foregroundColor(.white)
                    .frame(width: 18, height: 18)
                    .background(
                        LinearGradient(colors: [.yellow, .orange], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .clipShape(Circle())
                    .offset(x: (size/2 - 2), y: -(size/2 - 2))
            }
        }
        .scaleEffect(isSelected ? 1.1 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
    
    @ViewBuilder
    private var routeOverlay: some View {
        if routeStops.count >= 2 {
            // Route polyline via MapPolyline isn't directly available in this Map API
            // The route is shown via connected stops in the route planner
            EmptyView()
        }
    }
}
