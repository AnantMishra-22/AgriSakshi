export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export class LocationService {
  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: 0, message: 'Geolocation is not supported by this browser.' });
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          try {
            // Reverse geocoding to get address details
            const addressData = await LocationService.reverseGeocode(
              location.latitude, 
              location.longitude
            );
            resolve({ ...location, ...addressData });
          } catch (error) {
            // Return location even if reverse geocoding fails
            resolve(location);
          }
        },
        (error) => {
          reject({
            code: error.code,
            message: LocationService.getErrorMessage(error.code)
          });
        },
        options
      );
    });
  }

  static async getLocationFromPincode(pincode: string): Promise<LocationData> {
    try {
      // Using a free Indian postal code API
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data[0].Status === 'Success' && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        
        // For demonstration, using approximate coordinates
        // In a real app, you'd need a proper geocoding service
        const location: LocationData = {
          latitude: this.getApproximateLatitude(postOffice.State, postOffice.District),
          longitude: this.getApproximateLongitude(postOffice.State, postOffice.District),
          district: postOffice.District,
          state: postOffice.State,
          pincode: pincode,
          address: `${postOffice.District}, ${postOffice.State}`
        };
        
        return location;
      } else {
        throw new Error('Invalid pincode or no data found');
      }
    } catch (error) {
      throw new Error(`Failed to get location from pincode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async reverseGeocode(lat: number, lon: number) {
    try {
      // Using OpenStreetMap Nominatim for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        return {
          address: data.display_name,
          district: data.address.county || data.address.district,
          state: data.address.state,
          pincode: data.address.postcode
        };
      }
      return {};
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {};
    }
  }

  private static getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Permission denied. Please allow location access to get weather data.';
      case 2:
        return 'Position unavailable. Unable to determine your location.';
      case 3:
        return 'Timeout reached. Location request took too long.';
      default:
        return 'An unknown error occurred while getting your location.';
    }
  }

  // Approximate coordinates for major Indian states/districts
  // In a production app, you'd use a proper geocoding database
  private static getApproximateLatitude(state: string, district: string): number {
    const stateCoords: { [key: string]: number } = {
      'Andhra Pradesh': 15.9129,
      'Karnataka': 15.3173,
      'Tamil Nadu': 11.1271,
      'Kerala': 10.8505,
      'Maharashtra': 19.7515,
      'Gujarat': 22.2587,
      'Rajasthan': 27.0238,
      'Uttar Pradesh': 26.8467,
      'Bihar': 25.0961,
      'West Bengal': 22.9868,
      'Punjab': 31.1471,
      'Haryana': 29.0588,
      'Madhya Pradesh': 22.9734,
      'Odisha': 20.9517,
      'Telangana': 18.1124,
      'Assam': 26.2006
    };
    return stateCoords[state] || 20.5937; // Default to India center
  }

  private static getApproximateLongitude(state: string, district: string): number {
    const stateCoords: { [key: string]: number } = {
      'Andhra Pradesh': 79.7400,
      'Karnataka': 75.7139,
      'Tamil Nadu': 78.6569,
      'Kerala': 76.2711,
      'Maharashtra': 75.7139,
      'Gujarat': 71.1924,
      'Rajasthan': 74.2179,
      'Uttar Pradesh': 80.9462,
      'Bihar': 85.3131,
      'West Bengal': 87.8550,
      'Punjab': 75.3412,
      'Haryana': 76.0856,
      'Madhya Pradesh': 78.6569,
      'Odisha': 85.0985,
      'Telangana': 79.0193,
      'Assam': 92.9376
    };
    return stateCoords[state] || 78.9629; // Default to India center
  }
}