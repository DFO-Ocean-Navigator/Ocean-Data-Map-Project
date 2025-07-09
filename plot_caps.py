import xarray as xr
import cartopy.crs as ccrs
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker



# Open file                                                                                                                            
ds = xr.open_dataset("myfile.nc")



var = ds['votemper']  # or your variable name                                                                                          



# Get grid mapping CF info                                                                                                             
proj_attr = ds['rotated_pole'].attrs
rlat = ds['rlat']
rlon = ds['rlon']



# Create Cartopy rotated pole projection                                                                                               
rotated_pole = ccrs.RotatedPole(
   pole_longitude=proj_attr['grid_north_pole_longitude'],
   pole_latitude=proj_attr['grid_north_pole_latitude'],
   # option "north_pole_longitude" in Cartopy if present in your file                                                                 
)
polar_stereo = ccrs.NorthPolarStereo()
# Remove time dimension (assuming it is length 1)                                                                                      
data2d = var.values[0]  # shape (1830, 230)                                                                                            



# Build 2D coordinate grids                                                                                                            
rlon2d, rlat2d = np.meshgrid(rlon, rlat)  # both shape (1830, 230)                                                                     



fig = plt.figure(figsize=(8,8))
ax = plt.axes(projection=polar_stereo)



# This line says: "these coordinates are in rotated-pole space, so transform to polar stereo"                                          
mesh = ax.pcolormesh(
   rlon2d, rlat2d, data2d,
   transform=rotated_pole,      # <--- these values are in this projection                                                            
   cmap='viridis', shading='auto'
)



ax.coastlines()
ax.set_extent([-180, 180, 30, 90], crs=ccrs.PlateCarree())
gridliner = ax.gridlines(draw_labels=True, crs=ccrs.PlateCarree(),
                        color='k', alpha=0.6, linestyle='--')
gridliner.top_labels = False
gridliner.right_labels = False
# You can set spacing:                                                                                                                 
gridliner.xlocator = mticker.FixedLocator(np.arange(-180, 181, 30))
gridliner.ylocator = mticker.FixedLocator(np.arange(60, 91, 10))
plt.colorbar(mesh, label=str(var.attrs.get('units', '')))
plt.title(var.attrs.get('long_name', var.name))
plt.show()
 