import SwiftUI
import MapKit

struct RoutePlannerSheet: View {
    @ObservedObject var mapVM: MapViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var showMapsPicker = false
    @State private var showFullRoutePicker = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Navigate to next stop
                if let nextStop = mapVM.routeStops.first {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Navigate to next stop")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        if !showMapsPicker {
                            Button {
                                showMapsPicker = true
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "location.fill")
                                    Text("Open in Maps — \(nextStop.name)")
                                        .lineLimit(1)
                                }
                                .font(.body.weight(.semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.green)
                                .cornerRadius(14)
                            }
                        } else {
                            HStack(spacing: 8) {
                                Button {
                                    openInAppleMaps(lat: nextStop.lat, lng: nextStop.lng, name: nextStop.name)
                                    showMapsPicker = false
                                } label: {
                                    Text("Apple Maps")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color(white: 0.15))
                                        .cornerRadius(14)
                                }
                                Button {
                                    openInGoogleMaps(lat: nextStop.lat, lng: nextStop.lng)
                                    showMapsPicker = false
                                } label: {
                                    Text("Google Maps")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color(white: 0.15))
                                        .cornerRadius(14)
                                }
                                Button {
                                    showMapsPicker = false
                                } label: {
                                    Image(systemName: "xmark")
                                        .foregroundColor(.gray)
                                        .padding(14)
                                        .background(Color(white: 0.15))
                                        .cornerRadius(14)
                                }
                            }
                        }
                        
                        Text("Opens your chosen app with this stop. The full route stays here.")
                            .font(.caption2)
                            .foregroundColor(Color(white: 0.4))
                    }
                    .padding(16)
                    
                    Divider().background(Color(white: 0.15))
                }
                
                // Open full route (2+ stops)
                if mapVM.routeStops.count >= 2 {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Open full route (all \(mapVM.routeStops.count) stops)")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        if !showFullRoutePicker {
                            Button {
                                showFullRoutePicker = true
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "arrow.triangle.swap")
                                    Text("Open full route in Maps")
                                }
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color(white: 0.2))
                                .cornerRadius(14)
                            }
                        } else {
                            HStack(spacing: 8) {
                                Button {
                                    openFullRouteAppleMaps()
                                    showFullRoutePicker = false
                                } label: {
                                    Text("Apple Maps")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color(white: 0.15))
                                        .cornerRadius(14)
                                }
                                Button {
                                    openFullRouteGoogleMaps()
                                    showFullRoutePicker = false
                                } label: {
                                    Text("Google Maps")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color(white: 0.15))
                                        .cornerRadius(14)
                                }
                                Button {
                                    showFullRoutePicker = false
                                } label: {
                                    Image(systemName: "xmark")
                                        .foregroundColor(.gray)
                                        .padding(14)
                                        .background(Color(white: 0.15))
                                        .cornerRadius(14)
                                }
                            }
                        }
                        
                        Text("Apple Maps: first to last stop only. Google Maps: all waypoints.")
                            .font(.caption2)
                            .foregroundColor(Color(white: 0.4))
                    }
                    .padding(16)
                    
                    Divider().background(Color(white: 0.15))
                }
                
                // Stops list
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(Array(mapVM.routeStops.enumerated()), id: \.element.id) { index, stop in
                            stopRow(stop: stop, index: index)
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(red: 0.07, green: 0.07, blue: 0.07))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.triangle.swap")
                            .foregroundColor(.green)
                            .font(.subheadline)
                        Text("Your route")
                            .font(.headline)
                        Text("(\(mapVM.routeStops.count) stop\(mapVM.routeStops.count != 1 ? "s" : ""))")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    @ViewBuilder
    func stopRow(stop: CampLocation, index: Int) -> some View {
        HStack(spacing: 12) {
            Text("\(index + 1)")
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.green)
                .frame(width: 28, height: 28)
                .background(Color.green.opacity(0.2))
                .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 2) {
                Text(stop.name)
                    .font(.body.weight(.medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(stop.type.label)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .onTapGesture {
                mapVM.selectedLocation = stop
                dismiss()
            }
            
            HStack(spacing: 4) {
                Button {
                    guard index > 0 else { return }
                    mapVM.routeStops.swapAt(index, index - 1)
                } label: {
                    Image(systemName: "chevron.up")
                        .font(.caption)
                        .foregroundColor(index > 0 ? .gray : .gray.opacity(0.3))
                        .padding(6)
                }
                .disabled(index == 0)
                
                Button {
                    guard index < mapVM.routeStops.count - 1 else { return }
                    mapVM.routeStops.swapAt(index, index + 1)
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.caption)
                        .foregroundColor(index < mapVM.routeStops.count - 1 ? .gray : .gray.opacity(0.3))
                        .padding(6)
                }
                .disabled(index == mapVM.routeStops.count - 1)
                
                Button {
                    withAnimation { mapVM.routeStops.remove(at: index) }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(.red.opacity(0.8))
                        .padding(6)
                }
            }
        }
        .padding(12)
        .background(Color(white: 0.12))
        .cornerRadius(14)
    }
    
    func openInAppleMaps(lat: Double, lng: Double, name: String) {
        let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        let placemark = MKPlacemark(coordinate: coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
    
    func openInGoogleMaps(lat: Double, lng: Double) {
        if let url = URL(string: "comgooglemaps://?daddr=\(lat),\(lng)&directionsmode=driving"),
           UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        } else if let url = URL(string: "https://www.google.com/maps/dir/?api=1&destination=\(lat),\(lng)") {
            UIApplication.shared.open(url)
        }
    }
    
    func openFullRouteAppleMaps() {
        guard mapVM.routeStops.count >= 2 else { return }
        let first = mapVM.routeStops.first!
        let last = mapVM.routeStops.last!
        let source = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: first.lat, longitude: first.lng)))
        source.name = first.name
        let dest = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: last.lat, longitude: last.lng)))
        dest.name = last.name
        MKMapItem.openMaps(with: [source, dest], launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
    
    func openFullRouteGoogleMaps() {
        guard mapVM.routeStops.count >= 2 else { return }
        let first = mapVM.routeStops.first!
        let last = mapVM.routeStops.last!
        var urlStr = "https://www.google.com/maps/dir/?api=1&origin=\(first.lat),\(first.lng)&destination=\(last.lat),\(last.lng)"
        if mapVM.routeStops.count > 2 {
            let waypoints = mapVM.routeStops[1..<mapVM.routeStops.count-1].map { "\($0.lat),\($0.lng)" }.joined(separator: "|")
            urlStr += "&waypoints=\(waypoints)"
        }
        if let url = URL(string: urlStr) {
            UIApplication.shared.open(url)
        }
    }
}
