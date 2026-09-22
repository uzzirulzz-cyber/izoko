#!/usr/bin/env bash
# Playbeat Admin — Android APK build (no Gradle: aapt2 + ECJ + d8 + apksigner)
# Output: ../public/downloads/playbeat-admin-v<VERSION>.apk
set -euo pipefail

SDK=/home/z/my-project/scripts/android-sdk
BT=$SDK/build-tools-tmp/android-14
PLATFORM=$SDK/platforms/android-34/android.jar
ECJ=$SDK/dl/ecj.jar
PROJ="$(cd "$(dirname "$0")" && pwd)"
OUT=$PROJ/build
VERSION=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' $PROJ/AndroidManifest.xml | head -1)
VERSION_CODE=$(sed -n 's/.*android:versionCode="\([^"]*\)".*/\1/p' $PROJ/AndroidManifest.xml | head -1)
APK_NAME="playbeat-admin.apk"

echo "==> Building Playbeat Admin v$VERSION (code $VERSION_CODE)"

rm -rf $OUT
mkdir -p $OUT/gen $OUT/classes $OUT/dex $PROJ/../public/downloads

echo "==> [1/6] aapt2 compile resources"
$BT/aapt2 compile --dir $PROJ/res -o $OUT/res.zip

echo "==> [2/6] aapt2 link"
$BT/aapt2 link -o $OUT/base.apk \
  -I $PLATFORM \
  --manifest $PROJ/AndroidManifest.xml \
  -R $OUT/res.zip \
  --java $OUT/gen \
  --auto-add-overlay \
  --min-sdk-version 21 \
  --target-sdk-version 34 \
  --version-code $VERSION_CODE \
  --version-name "$VERSION"

echo "==> [3/6] ECJ compile java"
java -jar $ECJ -nowarn -source 1.8 -target 1.8 -encoding UTF-8 \
  -classpath $PLATFORM \
  -d $OUT/classes \
  $(find $PROJ/src $OUT/gen -name '*.java')

echo "==> [4/6] d8 dex"
$BT/d8 --release --min-api 21 --lib $PLATFORM \
  --output $OUT/dex \
  $(find $OUT/classes -name '*.class')

echo "==> [5/6] package + zipalign"
cp $OUT/base.apk $OUT/unsigned.apk
(cd $OUT/dex && zip -q $OUT/unsigned.apk classes.dex)
$BT/zipalign -f 4 $OUT/unsigned.apk $OUT/aligned.apk

echo "==> [6/6] sign"
KS=$PROJ/playbeat-release.keystore
if [ ! -f $KS ]; then
  keytool -genkeypair -v -keystore $KS -storepass playbeat2026 -keypass playbeat2026 \
    -alias playbeat -keyalg RSA -keysize 2048 -validity 10950 \
    -dname "CN=Playbeat Admin,O=Playbeat Digital,L=Abbottabad,C=PK"
fi
$BT/apksigner sign --ks $KS --ks-pass pass:playbeat2026 --key-pass pass:playbeat2026 \
  --out $OUT/$APK_NAME $OUT/aligned.apk
$BT/apksigner verify --print-certs $OUT/$APK_NAME | head -4

DEST=$PROJ/../public/downloads/$APK_NAME
cp $OUT/$APK_NAME $DEST
echo "==> DONE: $DEST ($(du -h $DEST | cut -f1))"
echo "SHA256: $(sha256sum $DEST | cut -d' ' -f1)"
