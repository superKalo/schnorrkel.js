import { describe, expect, it } from 'vitest'

import Schnorrkel, { Key } from '../../src/index'
import { _hashPrivateKey, generateRandomKeys } from '../../src/core'
import { ethers } from 'ethers'

describe('testing verify', () => {
  it('should verify a normal schnorr signature and make sure sign does not overwrite the private key', () => {
    const privateKey = new Key(Buffer.from(ethers.utils.randomBytes(32)))

    const msg = 'test message'
    const signature = Schnorrkel.sign(privateKey, msg)

    const publicKey = ethers.utils.arrayify(
      ethers.utils.computePublicKey(ethers.utils.computePublicKey(privateKey.buffer, false), true)
    )

    expect(signature).toBeDefined()
    expect(signature.finalPublicNonce.buffer).toHaveLength(33)
    expect(signature.signature.buffer).toHaveLength(32)
    expect(signature.challenge.buffer).toHaveLength(32)
    const result = Schnorrkel.verify(signature.signature, msg, signature.finalPublicNonce, new Key(Buffer.from(publicKey)))
    expect(result).toEqual(true)

    const secondMsg = 'this is another msg'
    const secondSig = Schnorrkel.sign(privateKey, secondMsg)
    const secondRes = Schnorrkel.verify(secondSig.signature, secondMsg, secondSig.finalPublicNonce, new Key(Buffer.from(publicKey)))
    expect(secondRes).toEqual(true)
  })
  it('should sum signatures and verify them', () => {
    const schnorrkelOne = new Schnorrkel()
    const schnorrkelTwo = new Schnorrkel()

    const keyPairOne = generateRandomKeys()
    const keyPairTwo = generateRandomKeys()
    const publicNoncesOne = schnorrkelOne.generatePublicNonces(keyPairOne.privateKey)
    const publicNoncesTwo = schnorrkelTwo.generatePublicNonces(keyPairTwo.privateKey)

    const publicNonces = [publicNoncesOne, publicNoncesTwo]
    const publicKeys = [keyPairOne.publicKey, keyPairTwo.publicKey]

    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(publicKeys)

    const msg = 'test message'
    const signatureOne = schnorrkelOne.multiSigSign(keyPairOne.privateKey, msg, publicKeys, publicNonces)
    const signatureTwo = schnorrkelTwo.multiSigSign(keyPairTwo.privateKey, msg, publicKeys, publicNonces)

    const signatures = [signatureOne.signature, signatureTwo.signature]
    const signaturesSummed = Schnorrkel.sumSigs(signatures)
    const result = Schnorrkel.verify(signaturesSummed, msg, signatureTwo.finalPublicNonce, combinedPublicKey)

    expect(result).toEqual(true)
  })
  it('should make sure private keys are not overwritten during signing', () => {
    const schnorrkelOne = new Schnorrkel()
    const schnorrkelTwo = new Schnorrkel()

    const keyPairOne = generateRandomKeys()
    const keyPairTwo = generateRandomKeys()

    const publicNoncesOne = schnorrkelOne.generatePublicNonces(keyPairOne.privateKey)
    const publicNoncesTwo = schnorrkelTwo.generatePublicNonces(keyPairTwo.privateKey)
    
    const publicNonces = [publicNoncesOne, publicNoncesTwo]
    const publicKeys = [keyPairOne.publicKey, keyPairTwo.publicKey]

    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(publicKeys)

    const msg = 'test message'
    const pkOneCache = new Key(Buffer.from(keyPairOne.privateKey.buffer))
    expect(pkOneCache.buffer).toEqual(keyPairOne.privateKey.buffer)
    const signatureOne = schnorrkelOne.multiSigSign(keyPairOne.privateKey, msg, publicKeys, publicNonces)
    expect(pkOneCache.buffer).toEqual(keyPairOne.privateKey.buffer)

    const pkTwoCache = new Key(Buffer.from(keyPairTwo.privateKey.buffer))
    expect(pkTwoCache.buffer).toEqual(keyPairTwo.privateKey.buffer)
    const signatureTwo = schnorrkelTwo.multiSigSign(keyPairTwo.privateKey, msg, publicKeys, publicNonces)
    expect(pkTwoCache.buffer).toEqual(keyPairTwo.privateKey.buffer)
    
    const signatures = [signatureOne.signature, signatureTwo.signature]
    const signaturesSummed = Schnorrkel.sumSigs(signatures)
    const result = Schnorrkel.verify(signaturesSummed, msg, signatureTwo.finalPublicNonce, combinedPublicKey)

    expect(result).toEqual(true)
  })
})