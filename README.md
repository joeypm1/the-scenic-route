# The Scenic Route

Basic directions made *Scenic*\
A Maps clone that prioritizes scenic routes instead of the fastest route.\
Users have the ability to submit road sections.\
State-designated Scenic Highways are used as well.

## Building a graph file

A graph file (.bin) must be used for route snapping functionality. Here is one way to do this:
1. Get a Protocolbuffer (.osm.pbf) file from [BBBike](https://extract.bbbike.org/). 
2. You'll need to [install Osmium Tool](https://osmcode.org/osmium-tool/) to run this:
```bash
osmium tags-filter \                                                                                  
  path/to/extracted.osm.pbf \
  w/highway=motorway \
  w/highway=trunk \
  w/highway=primary \
  w/highway=secondary \
  w/highway=tertiary \
  w/highway=unclassified \
  w/highway=residential \
  w/highway=service \
  -o filtered.osm.pbf \
  --overwrite
```
3. Clone the [route_snapper](https://github.com/dabreegster/route_snapper) repository.
4. You'll need to [install Rust](https://www.rust-lang.org/tools/install) to run this:
```bash
cd osm-to-route-snapper
cargo run --release -- \
  --input path/to/filtered.osm.pbf \
  --output graph.bin
```
5. Place graph.bin inside the static/graph directory.
