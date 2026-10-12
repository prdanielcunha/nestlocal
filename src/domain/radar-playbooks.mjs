// Radar-aligned starter catalogs. Every quote requires review by the provider.
// No inferred pricing, service availability, recurrence, warranty or automatic messages.
const question = (id, pt, en, es, required = true) => ({
  id, labelI18n: { pt, en, es }, type: 'text', required, maxLength: 180
});
const service = (id, pt, en, es, first, second) => ({
  id, name: pt, nameI18n: { pt, en, es },
  mode: 'review', requiresEquipmentType: false, requiresSafeAccess: false,
  intakeFields: second ? [first, second] : [first]
});
export const radarServicePlaybooks = Object.freeze({
  solar: { services: [
    service('solar-projeto', 'Projeto e instalação solar', 'Solar design and installation', 'Proyecto e instalación solar',
      question('systemNeed', 'Tipo de imóvel e necessidade', 'Property type and need', 'Tipo de inmueble y necesidad'),
      question('consumption', 'Consumo médio (se conhecido)', 'Typical usage (if known)', 'Consumo habitual (si se conoce)', false)),
    service('solar-limpeza', 'Limpeza de painéis solares', 'Solar panel cleaning', 'Limpieza de paneles solares',
      question('panels', 'Quantidade de painéis ou tamanho do sistema', 'Number of panels or system size', 'Cantidad de paneles o tamaño del sistema')),
    service('solar-manutencao', 'Manutenção solar', 'Solar maintenance', 'Mantenimiento solar',
      question('issue', 'Problema ou serviço necessário', 'Issue or service needed', 'Problema o servicio necesario'))
  ]},
  pools: { services: [
    service('piscina-manutencao', 'Manutenção de piscina', 'Pool maintenance', 'Mantenimiento de piscina',
      question('poolProfile', 'Tipo e tamanho aproximado da piscina', 'Pool type and approximate size', 'Tipo y tamaño aproximado de la piscina')),
    service('piscina-equipamento', 'Bombas, filtros e aquecimento', 'Pumps, filters and heating', 'Bombas, filtros y calefacción',
      question('equipmentIssue', 'Equipamento e necessidade', 'Equipment and need', 'Equipo y necesidad')),
    service('piscina-projeto', 'Construção ou reforma de piscina', 'Pool construction or renovation', 'Construcción o reforma de piscina',
      question('projectScope', 'Descrição da obra e etapa atual', 'Project scope and current stage', 'Alcance de la obra y etapa actual'))
  ]},
  water: { services: [
    service('purificador-refil', 'Troca de refil', 'Filter cartridge replacement', 'Cambio de cartucho',
      question('filterModel', 'Marca e modelo do purificador', 'Water filter brand and model', 'Marca y modelo del purificador')),
    service('purificador-instalacao', 'Instalação de purificador', 'Water filter installation', 'Instalación de purificador',
      question('filterModel', 'Modelo e local da instalação', 'Model and installation location', 'Modelo y lugar de instalación')),
    service('purificador-reparo', 'Manutenção de purificador', 'Water filter service', 'Mantenimiento de purificador',
      question('issue', 'Modelo e defeito percebido', 'Model and observed issue', 'Modelo y falla observada'))
  ]},
  gardens: { services: [
    service('jardim-manutencao', 'Jardinagem e manutenção', 'Gardening and maintenance', 'Jardinería y mantenimiento',
      question('gardenProfile', 'Tipo de área e tamanho aproximado', 'Area type and approximate size', 'Tipo de área y tamaño aproximado')),
    service('paisagismo', 'Projeto de paisagismo', 'Landscape design', 'Diseño de paisajismo',
      question('projectScope', 'O que deseja realizar?', 'What would you like to do?', '¿Qué desea realizar?'))
  ]},
  appliance: { services: [
    service('eletrodiagnostico', 'Diagnóstico de eletrodoméstico', 'Appliance diagnostics', 'Diagnóstico de electrodoméstico',
      question('equipment', 'Aparelho, marca e modelo', 'Appliance, brand and model', 'Equipo, marca y modelo'),
      question('issue', 'Defeito percebido', 'Observed fault', 'Falla observada')),
    service('eletroreparo', 'Conserto de eletrodoméstico', 'Appliance repair', 'Reparación de electrodoméstico',
      question('equipment', 'Aparelho, marca, modelo e defeito', 'Appliance, brand, model and fault', 'Equipo, marca, modelo y falla'))
  ]},
  technical: { services: [
    service('tecnico-diagnostico', 'Diagnóstico de equipamento', 'Device diagnostics', 'Diagnóstico de dispositivo',
      question('device', 'Equipamento, marca e modelo', 'Device, brand and model', 'Equipo, marca y modelo'),
      question('issue', 'Problema e sintomas', 'Problem and symptoms', 'Problema y síntomas')),
    service('tecnico-reparo', 'Manutenção de informática e eletrônicos', 'Computer and electronics repair', 'Reparación informática y electrónica',
      question('device', 'Equipamento e necessidade', 'Device and need', 'Equipo y necesidad'))
  ]},
  automotive: { services: [
    service('auto-estetica', 'Estética e detalhamento automotivo', 'Auto detailing', 'Detallado automotriz',
      question('vehicle', 'Veículo, modelo e porte', 'Vehicle, model and size', 'Vehículo, modelo y tamaño'),
      question('finish', 'Serviço ou acabamento desejado', 'Requested service or finish', 'Servicio o acabado deseado')),
    service('auto-revisao', 'Revisão e diagnóstico automotivo', 'Vehicle inspection and diagnostics', 'Revisión y diagnóstico automotriz',
      question('vehicle', 'Veículo, ano e necessidade', 'Vehicle, year and need', 'Vehículo, año y necesidad'))
  ]},
  glass: { services: [
    service('vidro-sobmedida', 'Vidros e esquadrias sob medida', 'Custom glass and frames', 'Vidrios y marcos a medida',
      question('measure', 'Local, medidas aproximadas e finalidade', 'Location, approximate dimensions and purpose', 'Lugar, medidas aproximadas y finalidad')),
    service('vidro-reparo', 'Manutenção de vidros e esquadrias', 'Glass and frame repair', 'Reparación de vidrios y marcos',
      question('issue', 'Tipo de peça e problema', 'Part type and issue', 'Tipo de pieza y problema'))
  ]},
  waterproofing: { services: [
    service('infiltracao-vistoria', 'Vistoria de infiltração', 'Leak inspection', 'Inspección de infiltraciones',
      question('leakLocation', 'Local da infiltração e sinais', 'Leak location and symptoms', 'Ubicación de infiltración y señales')),
    service('impermeabilizacao-obra', 'Impermeabilização e reparo', 'Waterproofing and repair', 'Impermeabilización y reparación',
      question('surface', 'Superfície, área aproximada e necessidade', 'Surface, approximate area and need', 'Superficie, área aproximada y necesidad'))
  ]},
  roofs: { services: [
    service('calhas-rufos', 'Calhas, rufos e telhados', 'Gutters, flashing and roofing', 'Canaletas, remates y techos',
      question('roofNeed', 'Tipo de instalação ou reparo', 'Installation or repair needed', 'Instalación o reparación necesaria')),
    service('toldos-coberturas', 'Toldos e coberturas', 'Awnings and covers', 'Toldos y cubiertas',
      question('coverArea', 'Local e medidas aproximadas', 'Location and approximate dimensions', 'Lugar y medidas aproximadas'))
  ]}
});
