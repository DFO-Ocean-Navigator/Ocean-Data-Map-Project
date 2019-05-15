
from plotting.scriptGenerator import time_query_conversion, generatePython, generateR
from oceannavigator import create_app
import hashlib
import json
import unittest


class TestScriptGenerator(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()

    @unittest.skip("Test is broken: these should not have been comparing hashes, but the entire output.")
    def test_generatePython_plot(self):
        
    #TEST PLOT ~~~~~~~~~~~~~~~~~~~
        with self.app.app_context():
                    
            plotQuery = '{"area":[{"innerrings":[],"name":"","polygons":[[[50.32977916630952,-54.02923583984376],[49.99194654491231,-41.90032958984374],[43.11512912870705,-41.90032958984374],[43.8801861709303,-54.20501708984374],[50.32977916630952,-54.02923583984376]]]}],"bathymetry":true,"colormap":"default","contour":{"colormap":"default","hatch":false,"legend":true,"levels":"auto","variable":"none"},"dataset":"giops_day","depth":0,"interp":"gaussian","neighbours":10,"projection":"EPSG:3857","quiver":{"colormap":"default","magnitude":"length","variable":"none"},"radius":25,"scale":"-5,30,auto","showarea":true,"time":860,"type":"map","variable":"votemper"}'
            
            #Find Hash
            data = generatePython(plotQuery)
            newData = data.read()
            m = hashlib.md5()
            m.update(newData)
            expectedHash = '8b123e00bc2cd955156666b63b91d3b1'
            
            self.assertEqual(m.hexdigest(), expectedHash)
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    #TEST CSV ~~~~~~~~~~~~~~~~~~~~
    def test_generatePython_csv(self):
        
        with self.app.app_context():
            
            plotQuery = '{"area":[{"innerrings":[],"name":"","polygons":[[[47.59676544537632,-63.322752995466445],[47.48923059927762,-62.7459688212614],[46.71147616396766,-62.92175066482866],[47.07117494555064,-63.848111528746855],[47.59676544537632,-63.322752995466445]]]}],"bathymetry":true,"colormap":"default","contour":{"colormap":"default","hatch":false,"legend":true,"levels":"auto","variable":"none"},"dataset":"giops_day","depth":0,"interp":"gaussian","neighbours":10,"projection":"EPSG:3857","quiver":{"colormap":"default","magnitude":"length","variable":"none"},"radius":25,"scale":"10.672692871093773,21.980279541015648,auto","showarea":true,"time":712,"type":"map","variable":"votemper"}&save&format=csv&size=10x7&dpi=144'

            data = generatePython(plotQuery)
            newData = data.read()
            m = hashlib.md5()
            m.update(newData)

            expectedHash = 'f10133b376d8741891edec5a508e47c9'

            self.assertEqual(m.hexdigest(), expectedHash)
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


    #TEST NETCDF ~~~~~~~~~~~~~~~~~   
    def test_generatePython_netcdf(self):

        with self.app.app_context():
            
            plotQuery = '{"dataset_name":"giops_day","max_range":"47.59676544537632,-62.7459688212614","min_range":"46.71147616396766,-63.848111528746855","output_format":"NETCDF4","should_zip":0,"time":"712,716","user_grid":0,"variables":"vice,votemper,vozocrtx,vomecrty"}'

            data = generatePython(plotQuery)
            newData = data.read()
            m = hashlib.md5()
            m.update(newData)

            expectedHash = '75abf8a73a79e859ad3a836c85b4c51a'

            self.assertEqual(m.hexdigest(), expectedHash)
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    #
    # R SCRIPTS
    #
    #TEST PLOT ~~~~~~~~~~~~~~~~~~~   
    @unittest.skip("Test is broken: these should not have been comparing hashes, but the entire output.")
    def test_generateR_plot(self):

        with self.app.app_context():
            
            plotQuery = '{"area":[{"innerrings":[],"name":"","polygons":[[[57.45537472457255,-53.32611083984376],[54.96545403664038,-35.91699909988563],[37.492919230762624,-40.57520222488561],[39.21584183791197,-60.08692097488562],[57.45537472457255,-53.32611083984376]]]}],"bathymetry":true,"colormap":"default","contour":{"colormap":"default","hatch":false,"legend":true,"levels":"auto","variable":"none"},"dataset":"giops_day","depth":0,"interp":"gaussian","neighbours":10,"projection":"EPSG:3857","quiver":{"colormap":"default","magnitude":"length","variable":"none"},"radius":25,"scale":"-5,30,auto","showarea":true,"time":862,"type":"map","variable":"votemper"}'

            data = generateR(plotQuery)
            newData = data.read()
            m = hashlib.md5()
            m.update(newData)

            expectedHash = '7442e1b8ac4b92d9a8aafa7edf6a8400'

            self.assertEqual(m.hexdigest(), expectedHash)
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    # TEST CSV ~~~~~~~~~~~~~~~~~~~
    @unittest.skip("Test is broken: these should not have been comparing hashes, but the entire output.")
    def test_generateR_csv(self):

        with self.app.app_context():
            
            plotQuery = '{"area":[{"innerrings":[],"name":"","polygons":[[[57.45537472457255,-53.32611083984376],[54.96545403664038,-35.91699909988563],[37.492919230762624,-40.57520222488561],[39.21584183791197,-60.08692097488562],[57.45537472457255,-53.32611083984376]]]}],"bathymetry":true,"colormap":"default","contour":{"colormap":"default","hatch":false,"legend":true,"levels":"auto","variable":"none"},"dataset":"giops_day","depth":0,"interp":"gaussian","neighbours":10,"projection":"EPSG:3857","quiver":{"colormap":"default","magnitude":"length","variable":"none"},"radius":25,"scale":"-5,30,auto","showarea":true,"time":862,"type":"map","variable":"votemper"}&save&format=csv&size=10x7&dpi=144'

            data = generateR(plotQuery)
            newData = data.read()
            m = hashlib.md5()
            m.update(newData)

            expectedHash = '4afa74cd7db4226c78fb7f5e2ae0a22f'

            self.assertEqual(m.hexdigest(), expectedHash)
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    # TEST NETCDF ~~~~~~~~~~~~~~~~
    @unittest.skip("Test is broken: these should not have been comparing hashes, but the entire output.")
    def test_generateR_netcdf(self):

        with self.app.app_context():
            
            plotQuery = '{"dataset_name":"giops_day","max_range":"57.45537472457255,-35.91699909988563","min_range":"37.492919230762624,-60.08692097488562","output_format":"NETCDF4","should_zip":0,"time":"857,862","user_grid":0,"variables":"vice,votemper,vozocrtx,vomecrty"}'

            data = generateR(plotQuery)
            newData = data.read()
            m = hashlib.md5()
            m.update(newData)

            expectedHash = '9c4552b8e34e8856bd8bde64125e7f2d'

            self.assertEqual(m.hexdigest(), expectedHash)
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~



    
