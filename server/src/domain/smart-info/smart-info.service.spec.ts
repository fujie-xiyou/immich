import { AssetEntity, SystemConfigKey } from '@app/infra/entities';
import {
  assetStub,
  newAssetRepositoryMock,
  newJobRepositoryMock,
  newMachineLearningRepositoryMock,
  newSmartInfoRepositoryMock,
  newSystemConfigRepositoryMock,
} from '@test';
import { IAssetRepository, WithoutProperty } from '../asset';
import { IJobRepository, JobName } from '../job';
import { ISystemConfigRepository } from '../system-config';
import { IMachineLearningRepository } from './machine-learning.interface';
import { ISmartInfoRepository } from './smart-info.repository';
import { SmartInfoService } from './smart-info.service';

const asset = {
  id: 'asset-1',
  resizePath: 'path/to/resize.ext',
} as AssetEntity;

describe(SmartInfoService.name, () => {
  let sut: SmartInfoService;
  let assetMock: jest.Mocked<IAssetRepository>;
  let configMock: jest.Mocked<ISystemConfigRepository>;
  let jobMock: jest.Mocked<IJobRepository>;
  let smartMock: jest.Mocked<ISmartInfoRepository>;
  let machineMock: jest.Mocked<IMachineLearningRepository>;

  beforeEach(async () => {
    assetMock = newAssetRepositoryMock();
    configMock = newSystemConfigRepositoryMock();
    smartMock = newSmartInfoRepositoryMock();
    jobMock = newJobRepositoryMock();
    machineMock = newMachineLearningRepositoryMock();
    sut = new SmartInfoService(assetMock, configMock, jobMock, smartMock, machineMock);

    assetMock.getByIds.mockResolvedValue([asset]);
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  describe('handleQueueObjectTagging', () => {
    it('should do nothing if machine learning is disabled', async () => {
      configMock.load.mockResolvedValue([{ key: SystemConfigKey.MACHINE_LEARNING_ENABLED, value: false }]);

      await sut.handleQueueObjectTagging({});

      expect(assetMock.getAll).not.toHaveBeenCalled();
      expect(assetMock.getWithout).not.toHaveBeenCalled();
    });

    it('should queue the assets without tags', async () => {
      assetMock.getWithout.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });

      await sut.handleQueueObjectTagging({ force: false });

      expect(jobMock.queue.mock.calls).toEqual([[{ name: JobName.CLASSIFY_IMAGE, data: { id: assetStub.image.id } }]]);
      expect(assetMock.getWithout).toHaveBeenCalledWith({ skip: 0, take: 1000 }, WithoutProperty.OBJECT_TAGS);
    });

    it('should queue all the assets', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });

      await sut.handleQueueObjectTagging({ force: true });

      expect(jobMock.queue.mock.calls).toEqual([[{ name: JobName.CLASSIFY_IMAGE, data: { id: assetStub.image.id } }]]);
      expect(assetMock.getAll).toHaveBeenCalled();
    });
  });

  describe('handleClassifyImage', () => {
    it('should do nothing if machine learning is disabled', async () => {
      configMock.load.mockResolvedValue([{ key: SystemConfigKey.MACHINE_LEARNING_ENABLED, value: false }]);

      await sut.handleClassifyImage({ id: '123' });

      expect(machineMock.classifyImage).not.toHaveBeenCalled();
      expect(assetMock.getByIds).not.toHaveBeenCalled();
    });

    it('should skip assets without a resize path', async () => {
      const asset = { resizePath: '' } as AssetEntity;
      assetMock.getByIds.mockResolvedValue([asset]);

      await sut.handleClassifyImage({ id: asset.id });

      expect(smartMock.upsert).not.toHaveBeenCalled();
      expect(machineMock.classifyImage).not.toHaveBeenCalled();
    });

    it('should save the returned tags', async () => {
      machineMock.classifyImage.mockResolvedValue(['tag1', 'tag2', 'tag3']);

      await sut.handleClassifyImage({ id: asset.id });

      expect(machineMock.classifyImage).toHaveBeenCalledWith(
        'http://immich-machine-learning:3003',
        {
          imagePath: 'path/to/resize.ext',
        },
        { enabled: true, minScore: 0.9, modelName: 'microsoft/resnet-50' },
      );
      expect(smartMock.upsert).toHaveBeenCalledWith({
        assetId: 'asset-1',
        tags: ['tag1', 'tag2', 'tag3'],
      });
    });

    it('should always overwrite old tags', async () => {
      machineMock.classifyImage.mockResolvedValue([]);

      await sut.handleClassifyImage({ id: asset.id });

      expect(machineMock.classifyImage).toHaveBeenCalled();
      expect(smartMock.upsert).toHaveBeenCalled();
    });
  });

  describe('handleQueueEncodeClip', () => {
    it('should do nothing if machine learning is disabled', async () => {
      configMock.load.mockResolvedValue([{ key: SystemConfigKey.MACHINE_LEARNING_ENABLED, value: false }]);

      await sut.handleQueueEncodeClip({});

      expect(assetMock.getAll).not.toHaveBeenCalled();
      expect(assetMock.getWithout).not.toHaveBeenCalled();
    });

    it('should queue the assets without clip embeddings', async () => {
      assetMock.getWithout.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });

      await sut.handleQueueEncodeClip({ force: false });

      expect(jobMock.queue).toHaveBeenCalledWith({ name: JobName.ENCODE_CLIP, data: { id: assetStub.image.id } });
      expect(assetMock.getWithout).toHaveBeenCalledWith({ skip: 0, take: 1000 }, WithoutProperty.CLIP_ENCODING);
    });

    it('should queue all the assets', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });

      await sut.handleQueueEncodeClip({ force: true });

      expect(jobMock.queue).toHaveBeenCalledWith({ name: JobName.ENCODE_CLIP, data: { id: assetStub.image.id } });
      expect(assetMock.getAll).toHaveBeenCalled();
    });
  });

  describe('handleEncodeClip', () => {
    it('should do nothing if machine learning is disabled', async () => {
      configMock.load.mockResolvedValue([{ key: SystemConfigKey.MACHINE_LEARNING_ENABLED, value: false }]);

      await sut.handleEncodeClip({ id: '123' });

      expect(assetMock.getByIds).not.toHaveBeenCalled();
      expect(machineMock.encodeImage).not.toHaveBeenCalled();
    });

    it('should skip assets without a resize path', async () => {
      const asset = { resizePath: '' } as AssetEntity;
      assetMock.getByIds.mockResolvedValue([asset]);

      await sut.handleEncodeClip({ id: asset.id });

      expect(smartMock.upsert).not.toHaveBeenCalled();
      expect(machineMock.encodeImage).not.toHaveBeenCalled();
    });

    it('should save the returned objects', async () => {
      smartMock.upsert.mockResolvedValue();
      machineMock.encodeImage.mockResolvedValue([0.01, 0.02, 0.03]);

      await sut.handleEncodeClip({ id: asset.id });

      expect(machineMock.encodeImage).toHaveBeenCalledWith(
        'http://immich-machine-learning:3003',
        { imagePath: 'path/to/resize.ext' },
        { enabled: true, modelName: 'ViT-B-32::openai' },
      );
      expect(smartMock.upsert).toHaveBeenCalledWith({
        assetId: 'asset-1',
        clipEmbedding: [0.01, 0.02, 0.03],
      });
    });
  });
});
