
// Map timestamps to datetimes (2275776000 => 2022-02-12T00:00:00+00:00)
export function buildNcTimestampDateTimeMap(remoteTimestampData) {
  return new Map(remoteTimestampData.map(i => [i.id, i.value]));
}

// Map datetimes to timestamps (2022-02-12T00:00:00+00:00 => 2275776000)
export function buildDateTimeNcTimestampMap(remoteTimestampData) {
  return new Map(remoteTimestampData.map(i => [i.value, i.id]));
}
