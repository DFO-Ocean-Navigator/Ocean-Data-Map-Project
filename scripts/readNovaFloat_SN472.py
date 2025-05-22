"""
Created on Wed Mar  7 17:26:47 2018

@author: xuj
"""

import csv
import os
import sys
from collections import Iterable, defaultdict

import cPickle as pickle
import jdcal
import laplaceFilter
import matplotlib.mlab as mlab
import matplotlib.pyplot as plt
import mpl_util
import numpy as np
from createMapsEtopo1 import findSubsetIndices

#from geographiclib.geodesic import Geodesic
from geographiclib import geodesic
from geopy.distance import geodesic
from jdcal import MJD_0, MJD_JD2000
from mpl_toolkits.basemap import Basemap, shiftgrid  # , NetCDFFile
from netCDF4 import Dataset
from pylab import *
from scipy import interpolate

#from GeographicLib import Geodesic, GeodesicLine


def flatten(l):
    for el in l:
#            if isinstance(el, collections.Iterable) and not isinstance(el, basestring):
        if isinstance(el, Iterable) and not isinstance(el, basestring):
            for sub in flatten(el):
                yield sub
        else:
            yield el


def makeMapnewArctic(lonStart,lonEnd,latStart,latEnd,lat1,lon1,foutPath,ax):
#    fig= plt.figure(figsize=(10,8))

    """Get the etopo2 data"""
#    etopo1name='ETOPO1_Ice_g_gmt4.grd'
#    etopo1name='/home/xuj/work/project/topo/ETOPO1/ETOPO1_Bed_c_gmt4.grd'
#    etopo1name='/home/xuj/work/project/topo/ETOPO1/barrowStrait.nc'

#    etopo1name='/home/xuj/work/project/topo/ETOPO1/testnew.nc'
    etopo1name='/home/xuj/work/project/whaleDectionRange/bathymetry/topo15_eastNew.nc'
    etopo1 = Dataset(etopo1name,'r')

    lons = etopo1.variables["lon"][:]
    lats = etopo1.variables["lat"][:]

#    lons = etopo1.variables["x"][:]
#    lats = etopo1.variables["y"][:]

    print("lons:", max(lons),min(lons))
    print(lons)

    print("lats:", max(lats),min(lats))
    print(lats)


    print("lon,lat,start, end:",lonStart,lonEnd,latStart,latEnd)
    print(" lat lon start end:", latStart-2,latEnd+5,lonStart-5,lonEnd+5)

    res = findSubsetIndices(latStart-1,latEnd+1,lonStart-1,lonEnd+1,lats,lons)

    print("res:::",res)

    lon,lat=np.meshgrid(lons[res[0]:res[1]],lats[res[2]:res[3]])

    print("shape of lon:",np.shape(lon))
    print("shape of lat:",np.shape(lat))
#    exit(1)

#    print "Extracted data for area %s : (%s,%s) to (%s,%s)"%(name,lon.min(),lat.min(),lon.max(),lat.max())
    bathy = etopo1.variables["z"][int(res[2]):int(res[3]),int(res[0]):int(res[1])]
    etopo1.close()
#    z0 = etopo1.variables["z"][int(res[0]):int(res[1]),int(res[2]):int(res[3])]
#    print ma.shape(z0)
#    z = ma.array().flatten()

    bathySmoothed = laplaceFilter.laplace_filter(bathy,M=None)

    y = lons[res[0]:res[1]]
    x = lats[res[2]:res[3]]

#    print ma.shape(z),ma.shape(x)
#    zi = matplotlib.mlab.griddata(x,y,z,lat, lon)

#    levels=[-5500,-5000,-2500, -2000, -1500, -1000,-500, -400, -300, -250, -200, -150, -100, -75, -65, -50, -35, -25, -15, -10, -5, 0]
    levels=[-5000,-4000,-3000,-1000,-500,-400,-300,-250, -200, -150, -100, -50,-20,-5,-1]

    if lonStart< 0 and lonEnd < 0:
        lon_0= - (abs(lonEnd)+abs(lonStart))/2.0
    else:
        lon_0=(abs(lonEnd)+abs(lonStart))/2.0

    print('Center longitude ',lon_0)

    map = Basemap(llcrnrlat=latStart,urcrnrlat=latEnd,\
            llcrnrlon=lonStart,urcrnrlon=lonEnd,\
            rsphere=(6378137.00,6356752.3142),\
            resolution='h',area_thresh=1000.,projection='lcc',\
            lat_1=latStart,lon_0=lon_0,ax=ax)

    x, y = map(lon,lat)

    map.drawcoastlines(linewidth=0.5)
    map.drawcountries()
    map.fillcontinents(color='grey')
    map.drawmeridians(np.arange(int(lons.min()),int(lons.max()),2),labels=[0,0,0,1],fontsize=10)
    map.drawparallels(np.arange(int(lats.min()),int(lats.max()),1),labels=[1,0,0,0],fontsize=10)
    #map.bluemarble()

#    CS1 = map.contourf(x,y,bathySmoothed,levels,
#                       cmap=mpl_util.LevelColormap(levels,cmap=cm.Blues_r),
#                       extend='upper',
#                       alpha=1.0,
#                       origin='lower')
#    CS2 = map.contour(x,y,zi,levels1,linewidths=0.5,colors='k',animated=True)
#    CS1 = map.contourf(x,y,zi,levels,cmap=mpl_util.LevelColormap(levels,cmap=cm.Blues_r),alpha=1.0)
    levels1=[-100]
    CS2 = map.contour(x,y,bathySmoothed,levels1,linewidths=0.5,colors='y',linestyles='solid',animated=True)
    plt.clabel(CS2,fontsize=4,inline=True)

    levels1=[-200]
    CS2 = map.contour(x,y,bathySmoothed,levels1,linewidths=0.5,colors='g',linestyles='solid',animated=True)
    plt.clabel(CS2,fontsize=4,inline=True)

#    levels1=[-400]
#    CS2 = map.contour(x,y,bathySmoothed,levels1,linewidths=0.5,colors='r',linestyles='solid',animated=True)
#    plt.clabel(CS2,fontsize=4,inline=True)
#
#    levels1=[-350]
#    CS2 = map.contour(x,y,bathySmoothed,levels1,linewidths=0.5,colors='k',linestyles='solid',animated=True)
#    plt.clabel(CS2,fontsize=4,inline=True)

    levels1=[-300]
    CS2 = map.contour(x,y,bathySmoothed,levels1,linewidths=0.5,colors='c',linestyles='solid',animated=True)
    plt.clabel(CS2,fontsize=4,inline=True)

    CS1 = map.contourf(x,y,bathySmoothed,levels,cmap=mpl_util.LevelColormap(levels,cmap=cm.Blues_r),alpha=1.0)
#    CS1 = map.contourf(x,y,bathySmoothed,levels,cmap=mpl_util.LevelColormap(levels,cmap=cm.ocean),alpha=1.0)
#    CS1 = map.contourf(x,y,bathySmoothed,levels,cmap=mpl_util.LevelColormap(levels,cmap=cm.jet),alpha=1.0)
#

#    CS1.axis='tight'
    """Plot the station as a position dot on the map"""
#    cbar= fig.colorbar(CS1,orientation='horizontal')
    cb = map.colorbar(CS1,"right", size="2.5%", pad='2%')
    cb.set_label('Depth (m)',fontsize=10)

#    map.plot(lon1,lat1,'r*', markersize=6,latlon='true')
    print(type(lon1), type(lat1), np.shape(lon1))
    
#    for lon2,lat2 in zip(lon1,lat1):
#        print lon2,lat2 
#        print type(lon2)
        
    for lon2,lat2 in zip(lon1,lat1):
        
        map.plot(float(lon2),float(lat2),'r.', markersize=2,latlon='true')


#    lat2 = Lat2[60]
#    lon2 = Lon2[60]
#    lat2 = Lat2[-1]
#    lon2 = Lon2[-1]

#    map.plot(lon2,lat2,'y*', markersize=1,latlon='true')

#    g = geodesic.Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2);
# Compute midpoint starting at 1
#    l=geodesic.Geodesic.WGS84.Line(g['lat1'],g['lon1'],g['azi1'])
#    num=50

#    print np.shape(lon)
#    print np.shape(lat)
#    print np.shape(bathySmoothed)
#
##    idx,idy = np.where(lon<-87 & lon<-95)  #  & lat>73 & lat<75  & bitwise operator
#    idx1,idy1 = np.where((lon<-55) & (lon>-60))
#    idx2,idy2 = np.where((lat > 55) & (lat < 58))  #  & lat>73 & lat<75
#
##    print np.shape(idx1)
##    print np.shape(idy1)
#    
#    print min(idx2),max(idx2),min(idy1),max(idy1)
#    print min(idx1),max(idx1),min(idy2),max(idy2)
#    
#    xn,yn = np.shape(lon)
#
#    idx1,idx2 = min(idx2),max(idx2)
#    idy1,idy2 = min(idy1),max(idy1)

#    idx1,idx2 = 251,551
##    idy1,idy2 = 1201,2201
#    
#    bathySmoothedN = bathySmoothed[idx1:idx2,idy1:idy2]
#    lonN = lon[idx1:idx2,idy1:idy2]
#    latN = lat[idx1:idx2,idy1:idy2]
#
#    print np.shape(lonN)
#    print np.shape(latN)
#    print np.shape(bathySmoothedN)
#
#    if False:
#        interpFile = foutPath+'linearInterp.pik'
#        if os.path.isfile(interpFile):
#            print "interpolation file is ready, unpacking it...."
#            with open(interpFile,'rb') as fpik:
#                finterp=pickle.load(fpik)
#                f = finterp
#        else:
#    #    exit(1)
#    #    f = interpolate.interp2d(lonN, latN, bathySmoothedN, kind='cubic')
#            print "interpolation file is not ready, working on it...."
#            f = interpolate.interp2d(lonN, latN, bathySmoothedN, kind='linear')
#            with open(interpFile,'w') as fpik:
#                pickle.dump(f,fpik)

#    f = interpolate.griddata(lonN, latN, bathySmoothedN, method='linear')
#    print "interpolation function is done"

#    exit(1)

#    f = interpolate.RectBivariateSpline(lon, lat, bathySmoothed, kx=2, ky=2, s=0)
#    f = interpolate.Rbf(lonN, latN, bathySmoothedN)

#    for i in range(num+1):
#        b=l.Position(i*g['s12']/num)
##        print(b['lat2'],b['lon2'])
#
#        if i ==0:
#            pass
#        else:
#            map.plot(b['lon2'],b['lat2'],'ko', markersize=0.5,latlon='true')
#
#        lati = b['lat2']
#        loni = b['lon2']
#        zi  = f(loni, lati)
#        zi = interpolate.griddata((lonN, latN), bathySmoothedN, (loni, lati),method='linear')
#        print loni,lati,zi

#    map.plot(lon2,lat2,'r*', markersize=1,latlon='true')

#    h1 = geodesic.Geodesic.WGS84.Direct(lat1, lon1, g['azi1'], g['s12']/2);
#    print(h1['lat2'],h1['lon2']);

    # Alternatively, compute midpoint starting at 2
#    h2 = geodesic.Geodesic.WGS84.Direct(lat2, lon2, g['azi2'], -g['s12']/2);
#    print(h2['lat2'],h2['lon2']);

#    p=Geodesic.WGS84.Inverse(40.6, -73.8, 1.4, 104);

#    for i in ma.arange(len(name)):
#
#        print i , name[i]
#        xpt,ypt = map(stLon[i*2],stLat[i*2])
#        xpt1,ypt1 = map(stLon[i*2+1],stLat[i*2+1])
#
#        map.plot([xpt],[ypt],'r.', markersize=5)
#        map.plot([xpt1],[ypt1],'r.', markersize=5)
#
#        plt.text(xpt+10000,ypt+10000,name[i], fontsize=7)

#        font = {'fontname':'Arial','weight':'bold','size':8}

#        matplotlib.rc('font', **font)
#    plt.title('Area %s'%(name))
#    plotfile='/home/xuj/work/project/noise/map_nls_north.jpg'
#    plotfile='/home/xuj/work/codes/barrowStraitSmall.jpg'

#    plt.show()
#    plt.close()
    return map
    
def readDay(fctd,fHK):
    print(fctd, fHK)
    
#    with open(fctd,'rb') as ctdCsvfile:
    cFlag = True
        
    with open(fctd,'rb') as ctdCsvfile:
        totalLine = sum(1 for _ in ctdCsvfile)
#        print totalLine 
        ctdCsvfile.seek(0)
        if totalLine < 3:
            print("there is no data in file:", fctd)
            novaFloat=defaultdict()
            
            cFlag = False 
        else:
            print(ctdCsvfile)
            reader =csv.reader(ctdCsvfile)
            print(reader)
            row0 = reader.next()
            
            fieldName=[]
            fields =[]
            
            fieldName.append("InstrumentName")
            fieldName.append("SN")
            fieldName.append("time")
            
            fields.append(row0[0])
            fields.append(row0[1])
            fields.append(row0[2])
            
            headerInfo = zip(fieldName,fields)
            print(headerInfo)
            
            novaFloat = dict(headerInfo)
            novaFloat = defaultdict(list,novaFloat)
            
            row1 = reader.next()
            row2 = reader.next()
            print(row1, row2)
            
            varName=[]
            for itemi,fitemi in zip(row1,row2):
    #            print itemi,float(fitemi)
                varName.append(itemi)
                novaFloat[itemi].append(float(fitemi))
    #            novaFloat.update([itemi,fitemi])
            
    
    
            for row in reader:            
    #            print row
                novaFloat[varName[0]].append(float(row[0]))
                novaFloat[varName[1]].append(float(row[1]))
                novaFloat[varName[2]].append(float(row[2]))
                    
    #            print varName
                if len(row[3])> 0:
                    novaFloat[varName[3]].append(float(row[3]))
                else:
                    novaFloat[varName[3]].append(np.NaN)
    if cFlag:
        
        with open(fHK,'rb') as hkCSVfile:
            reader =csv.reader(hkCSVfile)
            
            row0 = reader.next()
    #        print row0 
            fieldName = reader.next()
            fields = reader.next()
    
            headerInfo = zip(fieldName,fields)
            novaFloat.update(headerInfo)

#        print row0 
        
    return novaFloat 
    
def novafloatReader(fdataPath,dayi,novaFloatSN):
    
    yeari,monthi,dayi, houri = jdcal.jd2jcal(MJD_0,dayi)
    
    folderName = str(yeari)+'-'+str(monthi).rjust(2,'0')+'-'+str(dayi).rjust(2,'0')
    
    
    print(f"folderName: {folderName}")
    fpathc = fdataPath+'/'+folderName+'/'
    
    novaFloatDeployment=[]
    for dirname,dirnames,filenames  in os.walk(fpathc):
#        print len(filenames)
        if len(filenames) > 0:
            print(filenames)
            
#            exit(1)
            ctdFilename = []
            ctdFilenameDecent = []

            for filenamei in filenames:
                
                if novaFloatSN in filenamei:
                    if "CTD_CTD_ASCENT" in filenamei:
                        """
                        there are some folders with more than one day's files
                        there is just one DECENT Profile? rest are the ASCENT profiles 
                        
                        """
                        ctdFilename.append(filenamei)
                    
                    if "CTD_CTD_DESCENT" in filenamei:
                        ctdFilenameDecent.append(filenamei)
#                    print filenamei
                
            if len(ctdFilename)> 1:
#                pass
                print(ctdFilename)
                for filei in ctdFilename:
                    if folderName in filei:
#                        currentDay = filei
                        if "PARTIAL" in filei:
                            fHK=filei.replace("_CTD_ASCENT_PARTIAL_","_HK_")
                        else:
                            fHK=filei.replace("_CTD_ASCENT_","_HK_")

                        
                        floatdata =readDay(fpathc+filei,fpathc+fHK)
                        
                        if len(floatdata) > 0:
                            novaFloatDeployment.append(floatdata)
                    else:
                        substr= "ASCENT_"
                        lenSubStr = len(substr)
                        indx = filei.find(substr)
                        print(filei)
                        print(indx, filei[indx:indx+lenSubStr])
                        print(filei[indx+lenSubStr:indx+lenSubStr+10])
                        

                        if "PARTIAL" in filei:
                            fHK=filei.replace("_CTD_ASCENT_PARTIAL_","_HK_")
                        else:
                            fHK=filei.replace("_CTD_ASCENT_","_HK_")
                            
                        floatdata= readDay(fpathc+filei,fpathc+fHK)
                        if len(floatdata) > 0:
                            novaFloatDeployment.append(floatdata)
            else:
                for filei in ctdFilename:
                    if folderName in filei:
#                        currentDay = filei
                        if "PARTIAL" in filei:
                            fHK=filei.replace("_CTD_ASCENT_PARTIAL_","_HK_")
                        else:
                            fHK=filei.replace("_CTD_ASCENT_","_HK_")
                        
                        floatdata =readDay(fpathc+filei,fpathc+fHK)
                        
                        if len(floatdata) > 0:
                            novaFloatDeployment.append(floatdata)#            exit(1)novaFloatDeployment
                    
            
    return novaFloatDeployment
    

    
if __name__=="__main__":
    
    novaFloatSN= 'SN491'
    novaFloatSN= 'SN472'
    novaFloatSN= 'SN471'
    
    startDate = "2018-07-25"
#    startDate = "2018-07-25"

#    startDate = "2018-01-29"
#    startDate = "2018-11-01"
    
    endDate = "2018-03-07"

    endDate = "2018-03-27"

    endDate = "2018-05-15"

    endDate = "2018-05-31"

    endDate = "2018-06-06"
    endDate = "2018-07-05"

    endDate = "2018-12-07"
        
#    refMonth = 1
#    refDay = 1

    
    year1,month1,day1 = startDate.split('-')
    print(year1, month1, day1)
    
    year2,month2,day2 = endDate.split('-')
    print(year2, month2, day2)

#    MJD0 = jdcal.jcal2jd(year1,refMonth,refDay)[1]
    
#    exit()
        
    fpath= "/home/xuj/work/project/novaFloat/"
    foutPath = "/home/xuj/work/project/novaFloat/output/"
    
    fdataPath = "/home/xuj/work/project/novaFloat/data"
    
#    dayStart = jdcal.jcal2jd(year1,month1,day1)[1]-MJD_JD2000+1
#    dayEnd   = jdcal.jcal2jd(year2,month2,day2)[1]-MJD_JD2000+1

    dstart0,dayStart = jdcal.jcal2jd(year1,month1,day1)
    dend0,dayEnd     = jdcal.jcal2jd(year2,month2,day2)
    
#    print dstart0,dayStart,dend0,dayEnd
    
#    exit(1)
    
    
#    daytime=[]
    datenum = []
    lat = []
    lon = []
    
    salinity =[]
    temperature =[]
    pressure = []
    
    for dayi in np.arange(dayStart,dayEnd):
        novaFloatDeployment= novafloatReader(fdataPath,dayi,novaFloatSN)
        
#        if len(novaFloatDeployment) > 1:
        for floati in novaFloatDeployment:
            print(floati)
            datenum.append(floati["time"])

            latTmp = float(floati["GPSLAT"])
            lonTmp = float(floati["GPSLONG"])
            
#            print latTmp,lonTmp, type(latTmp),type(lonTmp)
#            print dayi,floati["time"]
            
#            exit(1)
            
            if latTmp > 180 or lonTmp > 180:
                latTmp = float(floati["IRIDLAT"])
                lonTmp = float(floati["IRIDLON"])
                print(latTmp,lonTmp, type(latTmp),type(lonTmp))
                
                
#            if False:
#                lat.append(floati["GPSLAT"]) 
#                lon.append(floati["GPSLONG"]) 

            lat.append(latTmp) 
            lon.append(lonTmp) 
            
            
#            sal = floati["Salinity"]
            
            salinity.append(floati["Salinity"])
            temperature.append(floati["Temperature"])
            pressure.append(floati["Pressure"])
            
#        else:
#            datenum.append(floati["time"])
#            lat.append(floati["GPSLAT"]) 
#            lon.append(floati["GPSLONG"])             
    

#        print novaFloatDeployment
#        print len(novaFloatDeployment)
#        exit(1)
    
#    print len(salinity)
#    print len(temperature)
#    print len(pressure)
    
    

#    print np.shape(salinity)
#    from itertools import chain
#    def flatten(listOfLists):
#        "Flatten one level of nesting"
#        return chain.from_iterable(listOfLists)
            
#    print list(flatten(salinity))
    
    
    salt = list(flatten(salinity))
    temp = list(flatten(temperature))
    pres = list(flatten(pressure))
    
    
    lat= list(flatten(lat))
    lon= list(flatten(lon))
    
    floatFile=novaFloatSN+'_novaFloat.pik'
    
#    with opeen('afile','w') as f:
    with open(floatFile,'w') as f:        
         pickle.dump((salinity,temperature,pressure,lat,lon,datenum),f)
    
#    exit(1)
    print(type(lat))
    print(len(salt), len(temp), len(pres))
    
#    import matplotlib.pyplot as plt
    
    fig1 = plt.figure(figsize=(12,6))
    ax1=fig1.add_axes([0.6525,0.085,0.285,0.825])
    
    lat_start=[60]
    lat_end  =[70]

    lon_start=[-65.5]
    lon_end  =[-51.]    
    
    mapplot=makeMapnewArctic(lon_start[0],lon_end[0],lat_start[0],lat_end[0],lat,lon,foutPath,ax1)
#    plt.scatter(salt, temp, s=5, c=pres, cmap = 'rainbow',alpha=0.5)

#    plt.scatter(salt, temp, s=15, edgecolor='none',c=pres, cmap = 'nipy_spectral',alpha=0.25)
#    plt.scatter(salt, temp, s=15, edgecolor='none',c=pres, cmap = 'jet',alpha=0.5)
#    plt.scatter(salt, temp, s=10, edgecolor='none',c=pres, cmap = 'seismic',alpha=0.5)
    ax2=fig1.add_axes([0.3,0.085,0.30,0.825])    
    
    cs1=plt.scatter(salt, temp, s=3, edgecolor='none',c=pres, cmap = 'jet',alpha=0.7)

    plt.xlabel("Salinity (PSU)" )
    plt.ylabel("Temperature ($^o$c)")
    
    cax1 = plt.colorbar()
#    "right", size="2.5%", pad='2%'
    
#    cax1.set
#    plt.clabel("Pressure (db)")
    cax1.set_label("Pressure (db)")
#    cax1.set_clim([0,300])
    
    ax3 = fig1.add_axes([0.065,0.085,0.175,0.825])
    ax3t = ax3.twiny()
    
    ax3.plot()
    
    plotfile=foutPath+novaFloatSN+'novafloat.jpg'
#    plt.savefig(plotfile,dpi=800,orientation='portrait')
    
#    plt.show()
    
    
    mapFile=novaFloatSN+'_afile_HB.pik'
#    with open('afile','w') as f:
    with open(mapFile,'w') as f:        
         pickle.dump((fig1,ax1,ax2,ax3,ax3t,mapplot),f)

#    plt.close()         
    
#            salinity.append(floati["Salinity"])
#            temperature.append(floati["Temperature"])
#            pressure.append(floati["Pressure"])    

    dayLen = len(salinity)
    
    for i in np.arange(dayLen):
        
        salt=np.array(salinity[i])
        temp=np.array(temperature[i])
        pres = np.array(pressure[i])
        
        dateStr = datenum[i]
        lati = lat[i]
        loni = lon[i]
        
        with open(mapFile,'rb') as f:
            fig1,ax1,ax2,ax3,ax3t,mapplot= pickle.load(f)

#        print len(salt),len(temp),len(pres)
    
        ax3.plot(temp,-pres,'r')
        ax3.set_xlabel("temperature ($^o$C)",color='r')
        ax3t.plot(salt,-pres,'b')
        ax3t.set_xlabel("Salinity (PSU)",color='b')
        
        ax3.set_ylabel("Pressure (db)")
        
        ax3t.set_xlim([29.25,34.75])
        ax2.set_xlim([29,35])
        ax3.set_xlim([-2.0,7])

        ax3.set_ylim([-500,0])
        ax3t.set_ylim([-500,0])

        ax3.set_ylim([-1500,0])
        ax3t.set_ylim([-1500,0])

        ax2.scatter(salt,temp, s=3, c='k')
        ax2.set_title(str(dateStr))
        mapplot.plot(float(loni),float(lati),'ko', markersize=4,latlon='true')
#        mapplot.plot(float(loni),float(lati),'yo', markersize=3,latlon='true')

#        fname = foutPath+"novaFloat_"+dateStr[:10]+".png"
#        print fname
#        plt.savefig(fname,format='png',dpi=800)
        fname = foutPath+"novafloat_"+novaFloatSN+'_'+str(i).rjust(4,'0')+".png"
        plt.savefig(fname,format='png',dpi=400)    
        plt.close()
#        exit(1)        
    
    
#    print 
#    print lat,lon,datenum


#    dayStart=dstart0+dayStart
#    dayEnd  = dend0+dayEnd
    
#    print dayStart,dayEnd 
    
#    exit()
    
    
#    print days
#    print dayStart,dayEnd
#    print np.floor(dayStart),np.floor(dayEnd)
#    exit(1)
#    initialDays =  np.arange(dayStart,dayEnd,5)

#    days = np.arange(dayStart,dayEnd,1)    

#    for dirname,dirnames,filenames  in os.walk(fpath):
            
            