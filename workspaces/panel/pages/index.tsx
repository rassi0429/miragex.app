import React, {useEffect, useState} from 'react';
import {Button, Card, Flex, Input, Layout, Modal, Tag, Typography} from 'antd';
import NamespaceCard from "@/Components/namespaceCard";
const { TextArea } = Input;

const {Header} = Layout;

const API_LIST_URL = "/api/namespaces"

type Namespace = {
  metadata: {
    name: string;
  }
}

const Index = () => {

  const [namespaces, setNameSpaces] = useState<Namespace[]>([]);

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [namespace, setNamespace] = useState("");
  const [deployRepoUrl, setDeployRepoUrl] = useState("");
  const [deployEnvVars, setDeployEnvVars] = useState("");
  const [deployHost, setDeployHost] = useState("");

  useEffect(() => {
    fetch(API_LIST_URL)
      .then(res => res.json())
      .then(data => {
        setNameSpaces(data);
      })
  }, []);


  return (
    <>
      <Modal title="Deploy" open={isDeployModalOpen} onCancel={() => {
        setIsDeployModalOpen(false)
      }} footer={(<></>)}>
        <Flex vertical gap={10}>
          <Input type="text" placeholder="namespace" value={namespace} onChange={(e) => setNamespace(e.target.value)}/>
          <Input type="text" placeholder="Repository URL" value={deployRepoUrl} onChange={(e) => setDeployRepoUrl(e.target.value)}/>
          <TextArea placeholder="Environment Variables" value={deployEnvVars} onChange={(e) => setDeployEnvVars(e.target.value)}/>
          <Input type="text" placeholder="Host" value={deployHost} onChange={(e) => setDeployHost(e.target.value)}/>
          <Button onClick={() => {
            fetch("/api/deploy", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                repoUrl: deployRepoUrl,
                envVars: deployEnvVars,
                host: deployHost,
                namespace
              })
            }).then(res => res.json())
              .then(data => {
                console.log(data);
                setTimeout(() => {
                  window.location.reload();
                }, 1000)
          })}}>Deploy</Button>
        </Flex>
      </Modal>
      <div className="App">
        <Layout>
          <Header>
            <div style={{
              height: "100%",
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography.Title level={3} style={{color: 'white', margin: 0}}>OpenKokopi Panel</Typography.Title>
              <Button type="primary" size={"large"} onClick={() => setIsDeployModalOpen(true)}>Deploy</Button>
            </div>
          </Header>
          <Layout.Content>
            <div style={{padding: 24}}>
              <Typography.Title level={2}>Apps</Typography.Title>
              <div>
                {namespaces.map(ns => (
                  <NamespaceCard namespace={ns.metadata.name} key={ns.metadata.name}/>
                ))}
              </div>
            </div>
          </Layout.Content>
        </Layout>
      </div>
    </>
  );
}

export default Index;
