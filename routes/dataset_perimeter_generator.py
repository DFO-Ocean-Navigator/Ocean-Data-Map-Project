#!/usr/bin/env python3
"""
Simple Dataset Perimeter Generator

Generates perimeter shapes for datasets once and stores them for fast location filtering.
Only needs to be run when datasets are added or their coverage changes.
"""

import os
import json
import logging
from typing import Dict, Optional, List
import numpy as np
from shapely.geometry import Polygon, Point, MultiPoint
import pickle

# Import your existing modules
from oceannavigator.dataset_config import DatasetConfig
from data import open_dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimplePerimeterGenerator:
    """Generates dataset perimeters for fast location filtering."""
    
    def __init__(self, output_file: str = "dataset_perimeters.pkl"):
        self.output_file = output_file
        
    def generate_all_perimeters(self):
        """Generate perimeters for all datasets and save to file."""
        logger.info("Generating dataset perimeters...")
        
        dataset_keys = DatasetConfig.get_datasets()
        perimeters = {}
        
        for i, dataset_key in enumerate(dataset_keys):
            logger.info(f"Processing {i+1}/{len(dataset_keys)}: {dataset_key}")
            
            try:
                perimeter = self._generate_dataset_perimeter(dataset_key)
                if perimeter:
                    perimeters[dataset_key] = perimeter
                    logger.info(f"✓ Generated perimeter for {dataset_key}")
                else:
                    logger.warning(f"✗ Could not generate perimeter for {dataset_key}")
                    
            except Exception as e:
                logger.error(f"✗ Error with {dataset_key}: {str(e)}")
        
        # Save perimeters
        self._save_perimeters(perimeters)
        logger.info(f"Saved {len(perimeters)} dataset perimeters to {self.output_file}")
        
        return perimeters
    
    def _generate_dataset_perimeter(self, dataset_key: str) -> Optional[Dict]:
        """Generate perimeter for a single dataset."""
        try:
            config = DatasetConfig(dataset_key)
            url = config.url if not isinstance(config.url, list) else config.url[0]
            
            if url.endswith(".sqlite3"):
                # SQLite datasets don't have spatial coverage - skip them
                logger.info(f"Skipping SQLite dataset {dataset_key} (no spatial coverage)")
                return None
            else:
                return self._generate_netcdf_perimeter(dataset_key, config)
                
        except Exception as e:
            logger.error(f"Error generating perimeter for {dataset_key}: {str(e)}")
            return None
    
    def _generate_netcdf_perimeter(self, dataset_key: str, config: DatasetConfig) -> Optional[Dict]:
        """Generate perimeter from NetCDF dataset."""
        try:
            # Get first available variable
            if not hasattr(config, 'variables') or not config.variables:
                return None
                
            sample_variable = list(config.variables.keys())[0]
            
            with open_dataset(config, variable=sample_variable, timestamp=-1) as dataset:
                # Find lat/lon variables
                lat_var, lon_var = self._find_coord_vars(dataset)
                if not lat_var or not lon_var:
                    return None
                
                # Get coordinate data
                lat_data = dataset.nc_data.dataset.variables[lat_var][:]
                lon_data = dataset.nc_data.dataset.variables[lon_var][:]
                
                # Create perimeter polygon
                polygon_coords = self._create_perimeter_coords(lat_data, lon_data)
                if not polygon_coords:
                    return None
                
                return {
                    'coords': polygon_coords,  # List of [lon, lat] pairs
                    'bounds': self._calculate_bounds(polygon_coords),  # [min_lon, min_lat, max_lon, max_lat]
                    'type': 'netcdf'
                }
                
        except Exception as e:
            logger.error(f"Error processing NetCDF dataset {dataset_key}: {str(e)}")
            return None
    
    def _find_coord_vars(self, dataset):
        """Find latitude and longitude variables in dataset."""
        lat_var = None
        lon_var = None
        
        # Try standard names first
        for var_name in dataset.nc_data.dataset.variables:
            var = dataset.nc_data.dataset.variables[var_name]
            if hasattr(var, 'standard_name'):
                if var.standard_name in ['latitude', 'grid_latitude']:
                    lat_var = var_name
                elif var.standard_name in ['longitude', 'grid_longitude']:
                    lon_var = var_name
        
        # Fallback to common names
        if not lat_var:
            for name in ['lat', 'latitude', 'y', 'nav_lat']:
                if name in dataset.nc_data.dataset.variables:
                    lat_var = name
                    break
                    
        if not lon_var:
            for name in ['lon', 'longitude', 'x', 'nav_lon']:
                if name in dataset.nc_data.dataset.variables:
                    lon_var = name
                    break
        
        return lat_var, lon_var
    
    def _create_perimeter_coords(self, lat_data: np.ndarray, lon_data: np.ndarray) -> Optional[List]:
        """Create perimeter coordinates from lat/lon arrays."""
        try:
            # Flatten and clean data
            lat_flat = lat_data.flatten()
            lon_flat = lon_data.flatten()
            
            # Remove invalid values
            valid_mask = ~(np.isnan(lat_flat) | np.isnan(lon_flat))
            lat_valid = lat_flat[valid_mask]
            lon_valid = lon_flat[valid_mask]
            
            if len(lat_valid) < 3:
                return None
            
            # Normalize longitude to [-180, 180]
            lon_valid = ((lon_valid + 180) % 360) - 180
            
            # Sample points if too many (for performance)
            if len(lat_valid) > 1000:
                indices = np.linspace(0, len(lat_valid)-1, 1000, dtype=int)
                lat_valid = lat_valid[indices]
                lon_valid = lon_valid[indices]
            
            # Create convex hull
            points = [(lon, lat) for lon, lat in zip(lon_valid, lat_valid)]
            multipoint = MultiPoint(points)
            hull = multipoint.convex_hull
            
            # Extract coordinates
            if isinstance(hull, Polygon):
                coords = list(hull.exterior.coords)
            else:
                # Fallback to bounding box if convex hull fails
                min_lon, min_lat = np.min(lon_valid), np.min(lat_valid)
                max_lon, max_lat = np.max(lon_valid), np.max(lat_valid)
                coords = [
                    [min_lon, min_lat],
                    [max_lon, min_lat],
                    [max_lon, max_lat], 
                    [min_lon, max_lat],
                    [min_lon, min_lat]
                ]
            
            return coords
            
        except Exception as e:
            logger.error(f"Error creating perimeter: {str(e)}")
            return None
    
    def _calculate_bounds(self, coords: List) -> List[float]:
        """Calculate bounding box from coordinates."""
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        return [min(lons), min(lats), max(lons), max(lats)]
    
    def _save_perimeters(self, perimeters: Dict):
        """Save perimeters to pickle file."""
        with open(self.output_file, 'wb') as f:
            pickle.dump(perimeters, f)
    
    def load_perimeters(self) -> Dict:
        """Load perimeters from file."""
        try:
            with open(self.output_file, 'rb') as f:
                return pickle.load(f)
        except FileNotFoundError:
            logger.error(f"Perimeters file not found: {self.output_file}")
            return {}
        except Exception as e:
            logger.error(f"Error loading perimeters: {str(e)}")
            return {}


class FastLocationChecker:
    """Fast location checking using pre-computed perimeters."""
    
    def __init__(self, perimeters_file: str = "dataset_perimeters.pkl"):
        self.perimeters_file = perimeters_file
        self.perimeters = {}
        self._load_perimeters()
    
    def _load_perimeters(self):
        """Load perimeters from file."""
        try:
            with open(self.perimeters_file, 'rb') as f:
                self.perimeters = pickle.load(f)
            logger.info(f"Loaded {len(self.perimeters)} dataset perimeters")
        except FileNotFoundError:
            logger.warning(f"Perimeters file not found: {self.perimeters_file}")
            self.perimeters = {}
        except Exception as e:
            logger.error(f"Error loading perimeters: {str(e)}")
            self.perimeters = {}
    
    def check_location(self, dataset_id: str, latitude: float, longitude: float, tolerance: float = 0.1) -> bool:
        """
        Check if a location is within a dataset's coverage.
        
        Args:
            dataset_id: Dataset identifier
            latitude: Target latitude
            longitude: Target longitude  
            tolerance: Buffer in degrees
            
        Returns:
            True if location is within dataset coverage
        """
        if dataset_id not in self.perimeters:
            # Check if this is a SQLite dataset (no spatial coverage)
            try:
                config = DatasetConfig(dataset_id)
                url = config.url if not isinstance(config.url, list) else config.url[0]
                if url.endswith(".sqlite3"):
                    # SQLite datasets are observational data, not spatial grids
                    # Return False since they don't have spatial coverage
                    logger.debug(f"SQLite dataset {dataset_id} has no spatial coverage")
                    return False
            except:
                pass
                
            # For other missing perimeters, fallback to original method
            logger.warning(f"No perimeter found for {dataset_id}, using fallback method")
            return self._fallback_check(dataset_id, latitude, longitude, tolerance)
        
        try:
            perimeter_data = self.perimeters[dataset_id]
            
            # Quick bounds check first
            bounds = perimeter_data['bounds']
            min_lon, min_lat, max_lon, max_lat = bounds
            
            if not (min_lon - tolerance <= longitude <= max_lon + tolerance and
                    min_lat - tolerance <= latitude <= max_lat + tolerance):
                return False
            
            # Create polygon and check if point is inside
            coords = perimeter_data['coords']
            polygon = Polygon(coords)
            
            if tolerance > 0:
                # Buffer the polygon for tolerance
                polygon = polygon.buffer(tolerance)
            
            point = Point(longitude, latitude)
            return polygon.contains(point)
            
        except Exception as e:
            logger.warning(f"Error checking location for {dataset_id}: {str(e)}")
            return self._fallback_check(dataset_id, latitude, longitude, tolerance)
    
    def filter_datasets(self, dataset_ids: List[str], latitude: float, longitude: float, tolerance: float = 0.1) -> List[str]:
        """Filter datasets by location."""
        matching_datasets = []
        
        for dataset_id in dataset_ids:
            if self.check_location(dataset_id, latitude, longitude, tolerance):
                matching_datasets.append(dataset_id)
        
        return matching_datasets
    
    def _fallback_check(self, dataset_id: str, latitude: float, longitude: float, tolerance: float) -> bool:
        """Fallback to original method if perimeter not available."""
        # Import your original function
        try:
            from api_v2_0 import check_dataset_location
            return check_dataset_location(dataset_id, latitude, longitude, tolerance)
        except Exception as e:
            logger.error(f"Fallback check failed for {dataset_id}: {str(e)}")
            return False
    
    def reload_perimeters(self):
        """Reload perimeters from file (useful after regeneration)."""
        self._load_perimeters()
    
    def get_coverage_info(self, dataset_id: str) -> Optional[Dict]:
        """Get coverage information for a dataset."""
        if dataset_id not in self.perimeters:
            return None
            
        perimeter_data = self.perimeters[dataset_id]
        bounds = perimeter_data['bounds']
        
        return {
            'dataset_id': dataset_id,
            'bounds': bounds,
            'coverage_type': perimeter_data['type'],
            'center_lat': (bounds[1] + bounds[3]) / 2,
            'center_lon': (bounds[0] + bounds[2]) / 2,
            'width_degrees': bounds[2] - bounds[0],
            'height_degrees': bounds[3] - bounds[1]
        }


def main():
    """Generate perimeters for all datasets."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate dataset perimeters')
    parser.add_argument('--output', default='dataset_perimeters.pkl', 
                       help='Output file for perimeters')
    parser.add_argument('--test', action='store_true', 
                       help='Test the generated perimeters')
    
    args = parser.parse_args()
    
    # Generate perimeters
    generator = SimplePerimeterGenerator(args.output)
    perimeters = generator.generate_all_perimeters()
    
    print(f"\n✓ Generated perimeters for {len(perimeters)} NetCDF datasets")
    print(f"✓ Saved to: {args.output}")
    
    # Show some examples
    if perimeters:
        print(f"\nExamples:")
        for i, (dataset_id, perimeter) in enumerate(list(perimeters.items())[:3]):
            bounds = perimeter['bounds']
            print(f"  {dataset_id}:")
            print(f"    Longitude: {bounds[0]:.2f}° to {bounds[2]:.2f}°")
            print(f"    Latitude: {bounds[1]:.2f}° to {bounds[3]:.2f}°")
        
        if len(perimeters) > 3:
            print(f"  ... and {len(perimeters) - 3} more NetCDF datasets")
    
    # Test if requested
    if args.test:
        print(f"\n🧪 Testing perimeter-based location filtering...")
        checker = FastLocationChecker(args.output)
        
        # Test with a few coordinates
        test_coords = [
            (45.0, -63.0, "Halifax area"),
            (49.0, -123.0, "Vancouver area"), 
            (75.0, -100.0, "Arctic Ocean"),
        ]
        
        for lat, lon, description in test_coords:
            print(f"\nTesting {description} ({lat}°, {lon}°):")
            
            # Only test against NetCDF datasets (those with perimeters)
            netcdf_datasets = list(perimeters.keys())
            matching = checker.filter_datasets(netcdf_datasets, lat, lon)
            
            print(f"  Found {len(matching)} matching NetCDF datasets out of {len(netcdf_datasets)} total")
            if len(matching) <= 5 and matching:
                for dataset_id in matching:
                    info = checker.get_coverage_info(dataset_id)
                    if info:
                        print(f"    ✓ {dataset_id} (center: {info['center_lat']:.1f}°, {info['center_lon']:.1f}°)")
            elif matching:
                print(f"    ✓ {matching[0]} (and {len(matching)-1} others)")
            else:
                print(f"    ✗ No NetCDF datasets cover this location")
        
        print(f"\n💡 Note: SQLite datasets are observational data and don't have spatial coverage")
        print(f"💡 Location filtering only applies to NetCDF gridded datasets")


if __name__ == "__main__":
    main()