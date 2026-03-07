import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Animated,
  Easing
} from "react-native";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface PollingUnit {
  latitude: number;
  longitude: number;
  name?: string;
}

interface LocationTrackerProps {
  pollingUnit: PollingUnit;
  refreshInterval?: number; // in milliseconds
  onDistanceChange?: (distance: number) => void;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  pollingUnit, 
  refreshInterval = 10000, // Default to 10 seconds
  onDistanceChange 
}) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [bearing, setBearing] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  // Start pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    
    if (isTracking) {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }
    
    return () => pulse.stop();
  }, [isTracking, pulseAnim]);
  
  // Compass animation
  useEffect(() => {
    if (bearing !== null) {
      Animated.timing(spinAnim, {
        toValue: bearing / 360,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [bearing, spinAnim]);
  
  // Calculate bearing between two points
  const calculateBearing = (
    startLat: number, 
    startLng: number, 
    destLat: number, 
    destLng: number
  ) => {
    startLat = startLat * Math.PI / 180;
    startLng = startLng * Math.PI / 180;
    destLat = destLat * Math.PI / 180;
    destLng = destLng * Math.PI / 180;

    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
              Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    brng = (brng + 360) % 360;
    
    return brng;
  };
  
  // Get location and start tracking
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    
    const startLocationTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied.");
          return;
        }
        
        // Get initial location
        let initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const { latitude, longitude, accuracy: locationAccuracy } = initialLocation.coords;
        setLocation({ latitude, longitude });
        setAccuracy(locationAccuracy);
        setLastUpdated(new Date());
        
        // Calculate initial distance and bearing
        const distanceInMeters = haversine(
          { latitude, longitude },
          { latitude: pollingUnit.latitude, longitude: pollingUnit.longitude }
        );
        
        setDistance(distanceInMeters);
        if (onDistanceChange) onDistanceChange(distanceInMeters);
        
        const initialBearing = calculateBearing(
          latitude, 
          longitude, 
          pollingUnit.latitude, 
          pollingUnit.longitude
        );
        setBearing(initialBearing);
        
        // Subscribe to location updates
        if (isTracking) {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10, // Update if moved by 10 meters
              timeInterval: refreshInterval
            },
            (newLocation) => {
              const { latitude, longitude, accuracy: locationAccuracy } = newLocation.coords;
              setLocation({ latitude, longitude });
              setAccuracy(locationAccuracy);
              setLastUpdated(new Date());
              
              // Calculate new distance and bearing
              const newDistanceInMeters = haversine(
                { latitude, longitude },
                { latitude: pollingUnit.latitude, longitude: pollingUnit.longitude }
              );
              
              setDistance(newDistanceInMeters);
              if (onDistanceChange) onDistanceChange(newDistanceInMeters);
              
              const newBearing = calculateBearing(
                latitude, 
                longitude, 
                pollingUnit.latitude, 
                pollingUnit.longitude
              );
              setBearing(newBearing);
            }
          );
        }
      } catch (error) {
        setErrorMsg("Failed to get location: " + (error instanceof Error ? error.message : String(error)));
      }
    };
    
    startLocationTracking();
    
    // Cleanup
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isTracking, pollingUnit, refreshInterval, onDistanceChange]);
  
  // Toggle tracking
  const toggleTracking = () => {
    setIsTracking(!isTracking);
  };
  
  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)} m`;
    } else {
      return `${(meters / 1000).toFixed(2)} km`;
    }
  };
  
  // Get status based on distance
  const getDistanceStatus = () => {
    if (!distance) return { color: "#6c757d", text: "Unknown" };
    
    if (distance <= 100) {
      return { color: "#28a745", text: "At Polling Unit" };
    } else if (distance <= 500) {
      return { color: "#ffc107", text: "Nearby" };
    } else {
      return { color: "#dc3545", text: "Far Away" };
    }
  };
  
  const distanceStatus = getDistanceStatus();
  
  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Spin interpolation for compass
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      style={styles.cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Live Location Tracking</Text>
            {lastUpdated && (
              <Text style={styles.lastUpdated}>
                Updated: {formatTime(lastUpdated)}
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.trackingButton, isTracking ? styles.trackingActive : styles.trackingInactive]} 
            onPress={toggleTracking}
          >
            <Text style={styles.trackingText}>{isTracking ? "Tracking" : "Paused"}</Text>
            {isTracking ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons name="radio" size={16} color="#fff" />
              </Animated.View>
            ) : (
              <Ionicons name="pause" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={24} color="#dc3545" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setErrorMsg(null);
                setIsTracking(true);
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !location ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : (
          <>
            <View style={styles.infoContainer}>
              <View style={styles.locationInfo}>
                <View style={styles.row}>
                  <MaterialIcons name="location-pin" size={20} color="#d9534f" />
                  <Text style={styles.detailLabel}>Your Location:</Text>
                  <Text style={styles.detailText}>
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </Text>
                </View>

                <View style={styles.row}>
                  <MaterialIcons name="place" size={20} color="#0275d8" />
                  <Text style={styles.detailLabel}>Polling Unit:</Text>
                  <Text style={styles.detailText}>
                    {pollingUnit.latitude.toFixed(5)}, {pollingUnit.longitude.toFixed(5)}
                  </Text>
                </View>
                
                {accuracy && (
                  <View style={styles.row}>
                    <Ionicons name="locate" size={18} color="#6c757d" />
                    <Text style={styles.detailLabel}>Accuracy:</Text>
                    <Text style={styles.detailText}>
                      ±{accuracy.toFixed(0)} meters
                    </Text>
                  </View>
                )}
              </View>
              
              {bearing !== null && (
                <View style={styles.compassContainer}>
                  <Animated.View style={[styles.compass, { transform: [{ rotate: spin }] }]}>
                    <Ionicons name="navigate" size={28} color="#007bff" />
                  </Animated.View>
                  <Text style={styles.compassLabel}>To Polling Unit</Text>
                </View>
              )}
            </View>
            
            <View style={styles.distanceContainer}>
              <View style={styles.distanceTextContainer}>
                <Text style={styles.distanceLabel}>Distance:</Text>
                <Text style={[styles.distanceValue, { color: distanceStatus.color }]}>
                  {distance ? formatDistance(distance) : "--"}
                </Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: `${distanceStatus.color}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: distanceStatus.color }]} />
                <Text style={[styles.statusText, { color: distanceStatus.color }]}>
                  {distanceStatus.text}
                </Text>
              </View>
            </View>
            
            {distance && distance > 500 && (
              <View style={styles.alertContainer}>
                <Ionicons name="warning-outline" size={20} color="#dc3545" />
                <Text style={styles.alertText}>
                  You are too far from your assigned polling unit!
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardGradient: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 10,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
  },
  trackingButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginLeft: 8,
  },
  trackingActive: {
    backgroundColor: "#28a745",
  },
  trackingInactive: {
    backgroundColor: "#6c757d",
  },
  trackingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 6,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#6c757d",
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#dc3545",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  infoContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationInfo: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginLeft: 6,
    marginRight: 4,
    width: 100,
  },
  detailText: {
    fontSize: 14,
    color: "#495057",
    flex: 1,
  },
  compassContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
  },
  compass: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#e9ecef",
  },
  compassLabel: {
    fontSize: 10,
    color: "#6c757d",
    marginTop: 4,
    textAlign: "center",
  },
  distanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  distanceTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginRight: 8,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  alertContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  alertText: {
    fontSize: 14,
    color: "#721c24",
    marginLeft: 8,
    flex: 1,
  },
});

export default LocationTracker;
