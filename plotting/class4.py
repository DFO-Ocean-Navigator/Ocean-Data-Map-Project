from netCDF4 import Dataset, chartostring
import matplotlib.pyplot as plt
import numpy as np
from StringIO import StringIO
import utils
import matplotlib.gridspec as gridspec
from mpl_toolkits.basemap import Basemap
from textwrap import wrap


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    class4 = query.get("class4id")
    if isinstance(class4, str) or isinstance(class4, unicode):
        class4 = class4.split(",")

    class4 = np.array([c.split("/") for c in class4])

    forecast = query.get('forecast')
    showmap = query.get('showmap') is None or bool(query.get('showmap'))
    climatology = query.get('climatology') is None or bool(
        query.get('climatology'))

    error = query.get('error')

    indices = class4[:, 1].astype(int)
    with Dataset("http://localhost:8080/thredds/dodsC/class4/%s.nc" %
                 class4[0][0], 'r') as ds:
        lat = ds['latitude'][indices]
        lon = ds['longitude'][indices]
        ids = map(str.strip, chartostring(ds['id'][indices]))

        variables = map(str.strip, chartostring(ds['varname'][:]))
        variable_units = map(str.strip, chartostring(ds['unitname'][:]))

        forecast_data = []
        observed_data = []
        climatology_data = []
        depths = []
        for i in indices:
            f_data = []
            o_data = []
            c_data = []
            for j in range(0, len(variables)):
                if forecast == 'best':
                    f_data.append(ds['best_estimate'][i, j, :])
                else:
                    f_data.append(ds['forecast'][
                        i, j, int(forecast), :
                    ])
                o_data.append(ds['observation'][i, j, :])
                c_data.append(ds['climatology'][i, j, :])
            forecast_data.append(np.ma.vstack(f_data))
            observed_data.append(np.ma.vstack(o_data))
            climatology_data.append(np.ma.vstack(c_data))
            depths.append(ds['depth'][i, :])

        depth_unit = ds['depth'].units

    forecast_data = np.ma.array(forecast_data)
    observed_data = np.ma.array(observed_data)
    climatology_data = np.ma.array(climatology_data)
    depths = np.ma.vstack(depths)

    filename = utils.get_filename(class4[0][0], None,
                                  variables, variable_units,
                                  None, None,
                                  filetype)
    if filetype == 'csv':
        output = StringIO()
        try:
            output.write("ID, Latitude, Longitude, Depth")
            for v in variables:
                output.write(", %s Model, %s Observed, %s Climatology" % (
                    v, v, v
                ))
            output.write("\n")

            for p_idx in range(0, len(ids)):
                for idx in range(0, len(depths[p_idx])):
                    if observed_data[p_idx, :, idx].mask.all():
                        continue
                    output.write("%s, %0.4f, %0.4f, %0.1f" % (
                        ids[p_idx],
                        lat[p_idx],
                        lon[p_idx],
                        depths[p_idx][idx]
                    ))
                    for v in range(0, len(variables)):
                        output.write(", %0.1f, %0.1f, %0.1f" % (
                            forecast_data[p_idx, v, idx],
                            observed_data[p_idx, v, idx],
                            climatology_data[p_idx, v, idx]
                        ))
                    output.write("\n")

            return (output.getvalue(), mime, filename)
        finally:
            output.close()
        pass
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

        width = len(variables)

        if showmap:
            width += 1

        gs = gridspec.GridSpec(1, width)

        subplot = 0

        if showmap:
            plt.subplot(gs[subplot])
            subplot += 1
            minlat = lat.min()
            maxlat = lat.max()
            minlon = lon.min()
            maxlon = lon.max()
            lat_d = max(maxlat - minlat, 20)
            lon_d = max(maxlon - minlon, 20)
            minlat -= lat_d / 2
            minlon -= lon_d / 2
            maxlat += lat_d / 2
            maxlon += lon_d / 2
            if minlat < -90:
                minlat = -90
            if maxlat > 90:
                maxlat = 90

            m = Basemap(
                llcrnrlon=minlon,
                llcrnrlat=minlat,
                urcrnrlon=maxlon,
                urcrnrlat=maxlat,
                lat_0=lat.mean(),
                lon_0=lon.mean(),
                resolution='c', projection='merc',
                rsphere=(6378137.00, 6356752.3142),
            )

            for idx in range(0, len(lon)):
                m.plot(lon[idx], lat[idx], 'o', latlon=True)
            m.etopo()
            m.drawparallels(
                np.arange(
                    round(minlat),
                    round(maxlat),
                    round(lat_d / 1.5)
                ), labels=[0, 1, 0, 0])
            m.drawmeridians(
                np.arange(
                    round(minlon),
                    round(maxlon),
                    round(lon_d / 1.5)
                ), labels=[0, 0, 0, 1])
            if len(ids) > 1:
                plt.legend(ids, loc='best')

        plot_label = ""
        for idx, v in enumerate(variables):
            plt.subplot(gs[subplot])
            subplot += 1

            legend = []
            for i in range(0, len(forecast_data)):
                if len(ids) > 1:
                    id_label = ids[i] + " "
                else:
                    id_label = ""

                form = '-'
                if observed_data[i, idx, :].count() < 3:
                    form = 'o-'

                if error in ['climatology', 'observation']:
                    if error == 'climatology':
                        plot_label = "Error wrt Climatology"
                        plt.plot(
                            forecast_data[i, idx, :] -
                            climatology_data[i, idx, :],
                            depths[i],
                            form
                        )
                        legend.append(
                            "%s %s" % (id_label, "Model"))
                        plt.plot(
                            observed_data[i, idx, :] -
                            climatology_data[i, idx, :],
                            depths[i],
                            form
                        )
                        legend.append(
                            "%s %s" % (id_label, "Observed"))
                    else:
                        plot_label = "Error wrt Observation"
                        plt.plot(
                            forecast_data[i, idx, :] -
                            observed_data[i, idx, :],
                            depths[i],
                            form
                        )
                        legend.append(
                            "%s %s" % (id_label, "Model"))
                        if climatology:
                            plt.plot(
                                climatology_data[i, idx, :] -
                                observed_data[i, idx, :],
                                depths[i], form)
                            legend.append(
                                "%s %s" % (
                                    id_label, "Climatology"))
                    lim = np.abs(plt.xlim()).max()
                    plt.xlim([-lim, lim])
                else:
                    plot_label = "Class 4"
                    plt.plot(forecast_data[i, idx, :], depths[i], form)
                    legend.append("%s %s" % (id_label, "Model"))
                    plt.plot(observed_data[i, idx, :], depths[i], form)
                    legend.append("%s %s" % (id_label, "Observed"))
                    if climatology:
                        plt.plot(climatology_data[i, idx, :], depths[i], form)
                        legend.append("%s %s" % (id_label, "Climatology"))

            plt.xlim([np.floor(plt.xlim()[0]), np.ceil(plt.xlim()[1])])
            plt.ylim([0, depths.max() * 1.2])
            plt.legend(legend, loc='lower left')

            plt.gca().xaxis.set_label_position('top')
            plt.gca().xaxis.set_ticks_position('top')
            plt.xlabel("%s (%s)" % (v, utils.mathtext(variable_units[idx])))
            plt.gca().invert_yaxis()
            plt.ylabel("Depth (%s)" % utils.mathtext(depth_unit))
            plt.grid(True)

        names = map(lambda x: "%s (%0.2f, %0.2f)" % x, zip(ids, lat, lon))

        plt.suptitle("%s\n%s" % (
            "\n".join(wrap(", ".join(names), 60)),
            plot_label
        ))
        fig.tight_layout(pad=3, w_pad=4)
        fig.subplots_adjust(top=0.88)

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
