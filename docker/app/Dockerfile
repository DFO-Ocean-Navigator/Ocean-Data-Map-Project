#!/bin/bash

# build Ocean Navigator 8.2 image

container=$(buildah from localhost/ocnav-runtime:v8.2)
echo $container

# install source
#wget https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project/archive/refs/tags/v8.2.tar.gz
buildah add $container v8.2.tar.gz /root
buildah run $container mv /root/Ocean-Data-Map-Project-8.2 /home/ocnav

# configure container
buildah config --workingdir /home/ocnav $container
buildah copy --chmod 755 $container entrypoint /entrypoint
buildah copy --chmod 755 $container runserver.sh bin
buildah config --cmd '' $container
buildah config --entrypoint '["/bin/sh", "bin/runserver.sh", "5000"]'  $container
buildah config --env HOME=/home/ocnav $container
# TODO: move this in the runtime image
buildah run $container apk -U add py3-hypercorn

# build frontend (assumes nvm/yarn/bower are already setup on the host)
cat > buildfe.sh <<EOF
#!/bin/sh
export NVM_DIR=/persistent/asd804/ocnav/tools/nvm
. \${NVM_DIR}/nvm.sh
. \${NVM_DIR}/bash_completion
img=\$(buildah mount $container)
cd \$img/home/ocnav/oceannavigator/frontend
yarn install --global-folder $HOME/.cache
yarn build
rm -rf node_modules
EOF

chmod +x buildfe.sh
buildah unshare ./buildfe.sh
buildah commit $container localhost/ovnav-app:v8.2
rm buildfe.sh
#buildah rm $container
