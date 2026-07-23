const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const toSnapshotArray = (serviceSnapshot) => {
  if (Array.isArray(serviceSnapshot)) return serviceSnapshot;
  return serviceSnapshot ? [serviceSnapshot] : [];
};

const normalizeService = (service, snapshot) => {
  const populatedService = service && typeof service === 'object' ? service : null;
  const legacyName = typeof service === 'string' && !OBJECT_ID_PATTERN.test(service)
    ? service.trim()
    : '';
  const name = populatedService?.name || legacyName || snapshot?.name || '';
  const populatedPrice = Number(populatedService?.price);
  const snapshotPrice = Number(snapshot?.price);

  return {
    name,
    price: Number.isFinite(populatedPrice)
      ? populatedPrice
      : Number.isFinite(snapshotPrice)
        ? snapshotPrice
        : null,
  };
};

export const getAppointmentServiceDetails = (appointment = {}) => {
  const populatedServices = Array.isArray(appointment.services) ? appointment.services : [];
  const snapshots = toSnapshotArray(appointment.serviceSnapshot);

  // Missing populated references can be removed from a Mongoose array and shift
  // indexes. In that case, the immutable booking snapshots are authoritative.
  if (snapshots.length > 0 && populatedServices.length !== snapshots.length) {
    return snapshots
      .map((snapshot) => normalizeService(null, snapshot))
      .filter((service) => service.name);
  }

  const serviceCount = Math.max(populatedServices.length, snapshots.length);
  return Array.from({ length: serviceCount }, (_, index) => (
    normalizeService(populatedServices[index], snapshots[index])
  )).filter((service) => service.name);
};

export const getAppointmentServicesLabel = (appointment, fallback = 'Service not available') => {
  const serviceNames = getAppointmentServiceDetails(appointment).map((service) => service.name);
  return serviceNames.length > 0 ? serviceNames.join(', ') : appointment?.service || fallback;
};

export const getAppointmentStylistName = (appointment, fallback = 'Stylist not available') => {
  const populatedStylistName = appointment?.stylist?.name || appointment?.staffId?.name;
  if (populatedStylistName) return populatedStylistName;

  const snapshotName = appointment?.stylistSnapshot?.name;
  if (snapshotName) return snapshotName;

  const legacyName = typeof appointment?.stylistName === 'string'
    && !OBJECT_ID_PATTERN.test(appointment.stylistName)
    ? appointment.stylistName.trim()
    : '';

  return legacyName || fallback;
};

export const getAppointmentTotalAmount = (appointment) => {
  if (appointment?.totalAmount !== undefined && appointment?.totalAmount !== null) {
    const totalAmount = Number(appointment.totalAmount);
    if (Number.isFinite(totalAmount)) return totalAmount;
  }

  return getAppointmentServiceDetails(appointment).reduce(
    (total, service) => total + (Number.isFinite(service.price) ? service.price : 0),
    0
  );
};
