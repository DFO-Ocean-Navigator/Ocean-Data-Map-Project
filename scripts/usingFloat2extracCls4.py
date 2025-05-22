#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
Created on Wed May 30 13:34:19 2018

read pikle file of nova floats 
and 
@author: xuj
"""

#dt0= datetime.strptime(timeStr, "%Y-%m-%d %H:%M")
import os
from datetime import datetime

import cPickle as pickle
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
from netCDF4 import Dataset
from novaFloatGiopsIce import novafloatIce

global novaId 

def getOutPath():
    foutPath = "/home/xuj/work/project/novaFloat/output/cls4/"
    
    return foutPath 

def readfromCls4file(fname,dayStr):
    badDataFlag = 9
    foutPath = getOutPath()
    
    DEVELOPING=False 
    print(fname)
    figName = (fname.split('/')[-1])[:-3]

#    print figName 
    
#    exit(1)
    
    cfile = Dataset(fname,'r')

    numObs0 = cfile.dimensions["numobs"]
    numCast0 = cfile.dimensions["numfcsts"]

#                    print len(numObs0), len(numCast0)
    numCast = len(numCast0)
    numObs  = len(numObs0)

    if len(numObs0) > 0 and "forecast" in cfile.variables.keys():

        instrumentId = cfile.variables["id"][:]

        numObs,numChar = np.shape(instrumentId)
        
#            s = [int(''.join(row)) for row in instrumentId]
        s = [''.join(row) for row in instrumentId]

#        print s 
        novaIn=True

        i = 0 
        for si in s:
            if novaId in si:
                
                novaIdx = i 
                novaIn=True

                break
            else:
                i+=1 
                novaIn=False
        
        if novaIn:
#            print novaIdx
#            print s[novaIdx]
            if DEVELOPING:
                forecast0  = cfile.variables["forecast"]
    #                    print forecast0._FillValue
                if hasattr(forecast0, '_FillValue'):
                    fillValue=forecast0._FillValue
                else:
                    fillValue=99999.0
                forecast  = np.squeeze(forecast0[novaIdx,:,:,:])
            else:
                forecast  = np.squeeze(cfile.variables["forecast"][novaIdx,:,:,:])
    
    
            bestEstimate = np.squeeze(cfile.variables["best_estimate"][novaIdx,:,:])
    
            dayObs    = np.squeeze(cfile.variables["observation"][novaIdx,:,:])
            dayObsSalt = np.squeeze(cfile.variables["observation"][novaIdx,1,:])
    
            qc  = np.squeeze(cfile.variables["qc"][novaIdx,:,:])
            depth = cfile.variables["depth"][novaIdx,:]
            
    #        for depthi in depth:
    #            print depthi
    
            lat = cfile.variables["latitude"][novaIdx]
            lon = cfile.variables["longitude"][novaIdx]
            
            climatology = cfile.variables["climatology"][novaIdx,:,:]
            
    
                                            
    #            print np.shape(instrumentId)
            
    #            print instrumentId 
            
            try:
                persistence = np.squeeze(cfile.variables["persistence"][novaIdx,:,:,:])
            except KeyError:
                print(f"There is no persistence variable in this file: {fname}")
                persistence=np.empty_like(forecast)*np.NaN
    
            cfile.close()
    
    
            if hasattr(dayObs, 'mask'):
                dayObs.mask[np.where(qc==badDataFlag)]=True
            else:
                mask0 = np.empty_like(dayObs)
                mask0[:]=False
                dayObs=np.ma.array(dayObs,mask=mask0)
                dayObs.mask[np.where(qc==badDataFlag)]=True
#    
#            numTrue = np.shape(np.where(dayObs.mask))
#    
#            print "numTrue ", numTrue
    
    #        print climatology
    #        print depth
            
    #            for depthi in depth:
    #                print depthi
    #        print qc
    #        for qci in qc:
    #            print qci
                
            if False:
#            if True:
                fig1=plt.figure()
                plt.subplot(121)
                plt.title(dayStr)
                plt.plot(dayObs[0,:],-depth,'k',label='data')
                
        #        for j in np.arange(10):
                for j in [4]:
        
                    plt.plot(forecast[0,j,:],-depth,label= "120Z")
                
                plt.plot(bestEstimate[0,:],-depth,'r--',label='BE')

                plt.plot(climatology[0,:],-depth,'g--',label='Climatology')
                    
        #        plt.legend()
                plt.xlabel("Temperature ($^o$C)")
                plt.ylabel('Depth (m)')
                plt.subplot(122)
                plt.plot(dayObs[1,:],-depth,'k',label='data')
                
                for j in [4]:
        #        for j in np.arange(10):
                    plt.plot(forecast[1,j,:],-depth,label= "120Z")
                    
                plt.plot(bestEstimate[1,:],-depth,'r--',label='BE')
                plt.plot(climatology[1,:],-depth,'g--',label='Climatology')
                
                plt.xlabel("Salinity (PSU)")
                plt.legend()
        
        #        plt.show()
                
                figName = foutPath+figName+'.png'
                print(figName)
                plt.savefig(figName)
                plt.close()            

            
        else:
            climatology,persistence,forecast,bestEstimate,dayObs,depth = 0,0,0,0,0,0
            pass 
        
                        


        return novaIn,climatology,persistence,forecast,bestEstimate,dayObs,depth        
#        exit(1)


            
def getFname(fCls4path,dayStr,modelStr):
    
    fileExist = True
    fname =""
    if "GIOPS" in modelStr:    
        giopsFileName0= "class4_"+dayStr+"_GIOPS_CONCEPTS_2.3_profile.nc"    
        giopsFileName1= "class4_"+dayStr+"_GIOPS_CONCEPTS_2.1_profile.nc"
    
        if os.path.isfile(fCls4path+giopsFileName0):
            giopsFileName = giopsFileName0
            fname = fCls4path+giopsFileName
        elif os.path.isfile(fCls4path+giopsFileName1):
            giopsFileName = giopsFileName1
            fname = fCls4path+giopsFileName
            
        else :
            fileExist =False 
            
            print("file missing on this day:" ,modelStr,dayStr)
    
        
    elif "FOAM" in modelStr:
        foamFilename = "class4_"+dayStr+"_FOAM_orca025_12.0_profile.nc" 
        if os.path.isfile(fCls4path+foamFilename):
            foamFileName = foamFilename
            fname = fCls4path+foamFileName
            
        else:
            print("file missing on this day:" ,modelStr, dayStr)
            fileExist =False 
                    
        
    elif "PSY4V3R1" in modelStr:        
        psy4Filename = "class4_"+dayStr+"_PSY4V3R1_orca12_profile.nc" 
        if os.path.isfile(fCls4path+psy4Filename):
            fname = fCls4path+psy4Filename    
        else:
            print("file missing on this day:", modelStr, dayStr)
            fileExist =False 
                        
    elif "HYCOM" in modelStr:        
        psy4Filename = "class4_"+dayStr+"_HYCOM_RTOFS_1.0_profile.nc" 
        if os.path.isfile(fCls4path+psy4Filename):
            fname = fCls4path+psy4Filename    
        else:
            print("file missing on this day:", modelStr, dayStr)
            fileExist =False 


    elif "NERSC" in modelStr:        
        psy4Filename = f"class4_{dayStr}_NERSC_ARCMFC_v3_profile.nc" 
        if os.path.isfile(fCls4path+psy4Filename):
            fname = fCls4path+psy4Filename    
        else:
            print("file missing on this day:", modelStr, dayStr)
            fileExist =False 

    elif "BLK" in modelStr:        
        psy4Filename = "class4_"+dayStr+"_BLK_omaps_3.1_profile.nc" 
        if os.path.isfile(fCls4path+psy4Filename):
            fname = fCls4path+psy4Filename    
        else:
            print("file missing on this day:", modelStr, dayStr)
            fileExist =False 

        
        
    return fname,fileExist

def readGiopsIce(lat,lon,datenum):
    di = 0            
    for datei in datenum:
        print(datei)
        dt0= datetime.strptime(datei, "%Y-%m-%d %H:%M:%S")
        dt1 = mdates.date2num(dt0)
#        dt2 = mdates.num2date(dt1)
        
#        print dt0,dt2
#        taxis.append(dt1)        
        
        dayStr = str(dt0.year)+str(dt0.month).rjust(2,'0')+str(dt0.day).rjust(2,'0')
#        print dayStr
        
        ficePath = "/home/xuj/work/project/novaFloat/iceData/"
        
        fname = ficePath+"giops_"+dayStr+"00_ice.nc"
        
        cfile = Dataset(fname,'r')
        
        aice = np.squeeze(cfile.variables["aice"][0,:,:])
        
    

    return aice # was giopsIce but its not defined 

    
if __name__=="__main__":
    
    novaFloatSN= 'SN491'

    novaId= "4902426"
    
    fpath = "/home/xuj/work/project/novaFloat/"
#    floatFile = fpath+"codes/"+"novaFloat.pik"
    floatFile = fpath+"codes/"+novaFloatSN+"_novaFloat.pik"
    
    fCls4path = "/mnt/md0/test/godae/cls4/"

    floatIceData =  fpath+"codes/"+novaFloatSN+"_floatGiopsIce.pik"

    with open(floatFile,'rb') as f:        
         salt,temp,pres,lat,lon,datenum = pickle.load(f)


    if os.path.isfile(floatIceData):
        with open(floatIceData,'rb') as f: 
            aice,datenumAice = pickle.load(f)
    else:
        aice,datenumAice = novafloatIce(datenum,lat,lon)        

        with open(floatIceData,'w') as f: 
            pickle.dump((aice,datenumAice),f)

    print(np.shape(aice))
    print(np.shape(datenumAice))
    
    aice = np.squeeze(np.array(aice))
    TEMPERATURE =[]
    SALINITY  = []
    DEPTH = []
    saltBESTESTIMATION = []
    tempBESTESTIMATION = []
    
    FORECAST =np.array([])

    saltFORECAST =[]
    saltCLIMATOLOGY =[]

    tempFORECAST =[]
    tempCLIMATOLOGY =[]
    CLIMATOLOGY =[]
    BESTESTIMATION =[]
    
    taxis = []
    rmsError120Z  = []
    biasError120Z = []
    dateNum   = []

    rmsBest  =   []
    biasBest =   []
    rmsClimatology =  []
    biasClimatology = []
#    Climatology =  []
    
    modelStr = "GIOPS"

        
    modelStr = "FOAM"
##    
    modelStr = "PSY4V3R1"
##
    modelStr = "HYCOM"
##    
    modelStr= "NERSC"
##
    modelStr= "BLK"
        

    modelFile = modelStr+'_'+novaFloatSN+"_novaFloat.pik"

    modelFile2 = modelStr+'_'+novaFloatSN+"_forecast.pik"

    if os.path.isfile(modelFile) and os.path.isfile(modelFile2):
        with open(modelFile,'rb') as f:        
            (rmsError120Z,rmsBest,rmsClimatology,biasError120Z,biasBest,biasClimatology,dateNum) = pickle.load(f)
            
        with open(modelFile2,'rb') as f:        
            (BESTESTIMATION,CLIMATOLOGY,FORECAST,DEPTH,TEMPERATURE,SALINITY) = pickle.load(f)

    else:

        di = 0            
        for datei in datenum:
            print(datei)
            dt0= datetime.strptime(datei, "%Y-%m-%d %H:%M:%S")
            dt1 = mdates.date2num(dt0)
            dt2 = mdates.num2date(dt1)
            
    #        print dt0,dt2
            taxis.append(dt1)        
            
            dayStr = str(dt0.year)+str(dt0.month).rjust(2,'0')+str(dt0.day).rjust(2,'0')
            print(dayStr)
            
    
            
            fname,fileExist= getFname(fCls4path,dayStr,modelStr)
            
            if fileExist:
                novaIn,climatology,persistence,forecast,bestEstimate,dayObs,depth = readfromCls4file(fname,dayStr)
                
                print(type(dayObs), np.shape(dayObs))
                print(np.shape(depth))
                print(np.shape(forecast))
                print(np.shape(bestEstimate))
                
                
#                unmaskedDayObs = np.ma.masked_equal(dayObs,True)
#                unmaskedDayObs = np.ma.getdata(dayObs,False)
#                unmaskedDayObs = np.ma.compressed(dayObs)
                
#                print np.shape(unmaskedDayObs)
#                print unmaskedDayObs
                

                
#                exit(1)
                if novaIn:
                    print(np.shape(climatology))
                    print(np.shape(depth))
                    print(np.shape(persistence))
    
                    errorClimate = climatology - dayObs
    
                    numVar,numForecast,numDepth = np.shape(persistence)
                    
    #                tempClim=climatology[0,:]
                    errorPersist = np.empty_like(persistence)
                    errorForcast = np.empty_like(forecast)
                    
                    for fi in np.arange(numForecast):
                        errorPersist[:,fi,:] = persistence[:,fi,:] - dayObs 
                        errorForcast[:,fi,:] = forecast[:,fi,:] - dayObs
                    
                    errorBest    = bestEstimate - dayObs
                    
                    print(np.shape(errorClimate), np.shape(errorPersist))
                    print(np.shape(errorForcast), np.shape(errorBest))
                    
                    rmsClimat = np.sqrt(np.mean(errorClimate**2,axis=1))
                    biasClimat = np.mean(errorClimate,axis=1)
                    print(np.shape(rmsClimat))
                    
                    rmsPersist = np.sqrt(np.mean(errorPersist**2,axis=2))
                    rmsCast    = np.sqrt(np.mean(errorForcast**2,axis=2))
    
    
                    biasPersist = np.mean(errorPersist,axis=2)
                    biasCast    = np.mean(errorForcast,axis=2)
                    
                    rmsErrorBest = np.sqrt(np.mean(errorBest**2,axis=1))
                    biasErrorBest = np.mean(errorBest,axis=1)
    
                    rmsError120Z.append(rmsCast[:,4])
                    biasError120Z.append(biasCast[:,4])
                    
                    dateNum.append(dt1)
                    rmsBest.append(rmsErrorBest)
                    biasBest.append(biasErrorBest)
                    rmsClimatology.append(rmsClimat)
                    biasClimatology.append(biasClimat)

                    """
                    The following is for plot the vertical profiles 
                    """
                    colMask = np.ma.getmask(dayObs[0,:])
                    dataIdx = np.squeeze(np.where(~colMask))
                    

                    temp = np.ma.compressed(dayObs[0,dataIdx])
#                    print type(temp)
#                    print len(temp)
                    
                    tempSal = np.ma.compressed(dayObs[1,dataIdx])
                    tempSize=len(temp)
                    saliSize=len(tempSal)        
                    
                    if tempSize == saliSize:

                        TEMPERATURE.extend(temp)
                        SALINITY.extend(tempSal)
                        DEPTH.extend(depth[dataIdx])                        
                        
                    else:
                        print("now", di)
                        print(tempSize, saliSize)
#                        print dayObs
#                        exit(1)                        
                    
                    if di==0:
#                        print np.shape(dataIdx)
#                        print np.shape(bestEstimate)
                        temp = bestEstimate[:,dataIdx]
#                        print np.shape(temp)
                        BESTESTIMATION = np.array(temp)
#                        print np.shape(BESTESTIMATION)
                        
                        temp = climatology[:,dataIdx]
                        CLIMATOLOGY = temp 
                        
                        FORECAST = forecast[:,:,dataIdx]
                        
#                        exit(1)
                    else:
                        
                        if tempSize == saliSize:
                            temp = bestEstimate[:,dataIdx]
    #                        print "newData :",np.shape(temp)
    #                        print "previous one:",np.shape(BESTESTIMATION)
                            BESTESTIMATION = np.hstack((BESTESTIMATION,temp))
                            
                            CLIMATOLOGY = np.hstack((CLIMATOLOGY,climatology[:,dataIdx]))
                            temp =forecast[:,:,dataIdx]
                            print(np.shape(temp),np.shape(FORECAST))
                            FORECAST= np.dstack((FORECAST,forecast[:,:,dataIdx]))
                            print(np.shape(temp),np.shape(FORECAST))
                        
                        
#                        np.append(BESTESTIMATION,bestEstimate[1,dataIdx],1)
#                        print "shape of BESTESTIMATION",np.shape(BESTESTIMATION)

#                    FORECAST.append(forecast[0,:,dataIdx],0)
#                    FORECAST.append(forecast[1,:,dataIdx],1)
                    
#                    CLIMATOLOGY.extend(climatology[:,dataIdx])
#                    CLIMATOLOGY.append(climatology[0,dataIdx],0)
#                    CLIMATOLOGY.append(climatology[1,dataIdx],1)rmsClimatology
                    

                    
                    di+=1
                    
#                    if di > 10:
#                        print type(TEMPERATURE)
#                        DEPTH = np.array(DEPTH)
#                        TEMPERATURE = np.array(TEMPERATURE)
#                        SALINITY = np.array(SALINITY)
##                        FORECAST = np.array(FORECAST)
##                        CLIMATOLOGY = np.array(CLIMATOLOGY)
#                        
#                        print np.shape(DEPTH)
##                        print DEPTH
#                        print np.shape(TEMPERATURE)
#                        print np.shape(SALINITY)
#                        
#                        print np.shape(CLIMATOLOGY)
#                        print np.shape(FORECAST)
#                        
#                        exit(1)
                    
                    if False:
                        fig2=plt.figure()
        #                plt.subplot(121)
                        plt.plot(0,rmsErrorBest[0],'r*')
                        plt.plot(0,biasErrorBest[0],'r*')
        
                        plt.plot(0,rmsClimat[0],'go')
                        plt.plot(0,biasClimat[0],'go')
                        
                        plt.plot(np.arange(10)+0.5,rmsCast[0,:])
                        plt.plot(np.arange(10)+0.5,biasCast[0,:])
        
                        plt.plot(np.arange(10)+0.5,rmsPersist[0,:],'k--')
                        plt.plot(np.arange(10)+0.5,biasPersist[0,:],'k--')
                        
                        
                        plt.show()
                        plt.close()
    #                plt.subplot(122)
                    
                    print(np.shape(rmsClimat),rmsClimat)
                    
    #                if hasattrdayObs, 'mask'):
    #                    dayObs.mask[np.where(qc==badDataFlag)]=True
    #                else:
    #                    mask0 = np.empty_like(dayObs)
    #                    mask0[:]=False
    #                    dayObs=np.ma.array(dayObs,mask =mask0)
    #                    dayObs.mask[np.where(qc==badDataFlag)]=True
    #                exit(1)
                    
                else:
                    print(f"There is no Nova float data for this Day:{dayStr}")
            
    
                
            print(np.shape(dateNum))      
            print(np.shape(rmsError120Z))
        
        with open(modelFile,'w') as f:        
            pickle.dump((rmsError120Z,rmsBest,rmsClimatology,biasError120Z,biasBest,biasClimatology,dateNum),f)

        with open(modelFile2,'w') as f:        
            pickle.dump((BESTESTIMATION,CLIMATOLOGY,FORECAST,DEPTH,TEMPERATURE,SALINITY),f)

    
    rmsError120Z =np.array(rmsError120Z)
    rmsBest = np.array(rmsBest)
    rmsClimatology = np.array(rmsClimatology)
    
    biasError120Z = np.array(biasError120Z)
    biasBest = np.array(biasBest)
    biasClimatology = np.array(biasClimatology)

    varIdx = 0 
    varIdx = 1 
    
    fig3=plt.figure(figsize=(8,6))
    
    ax1 = fig3.add_subplot(111)

    plt.title(modelStr)
    plt.plot(dateNum,rmsError120Z[:,varIdx],label="120Z Forecast")
    plt.plot(dateNum,rmsBest[:,varIdx],label="Best Estimation")
    plt.plot(dateNum,rmsClimatology[:,varIdx],label="Climatology")
    
#    plt.plot(dateNum,biasError120Z[:,varIdx],'--',label="120Z -Bias")
#    plt.plot(dateNum,biasBest[:,varIdx],'--',label="BestE Bias")
#    plt.plot(dateNum,biasClimatology[:,varIdx],'--',label="Clim. Bias")
    if varIdx == 1:
        plt.ylabel("Salinity")
        figName="novaFloat_"+novaFloatSN+'_'+modelStr+"_Salinity"+".png"
        ax1.set_ylim(-0.05,1.4)

    else:
        plt.ylabel("Temperature")
        figName="novaFloat_"+novaFloatSN+'_'+modelStr+"_Temperature"+".png"
        ax1.set_ylim(-0.25,3.25)
        
    
    ylim=ax1.get_ylim()
    aice[np.where(aice<0.4)]=ylim[0]+0.05
    aice[np.where(aice>=0.4)]=ylim[1]-0.05
    
    plt.plot(datenumAice,aice,'r--',label="Sea Ice",alpha=0.6)
#    ax1.fill(datenumAice,aice,'r',alpha=0.3)
    


    plt.legend()
    date_formatter = mdates.DateFormatter('%Y-%m-%d')
    ax1.xaxis.set_major_formatter(date_formatter)
    ax1.xaxis.set_major_locator(mdates.AutoDateLocator(interval_multiples=True))

    for label in ax1.get_xticklabels():
        label.set_rotation(30)
        label.set_horizontalalignment('right')

    plt.savefig(figName)
#    plt.show()
    plt.close()
    
    
    
    
    print(np.shape(taxis))
    print(np.shape(salt))
    print(np.shape(temp))
    print(np.shape(pres))
    