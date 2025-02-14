import {Button, Card, Modal, Tag, Typography} from "antd";
import React, {useEffect, useState} from "react";

type NamespaceCardProps = {
  namespace: string;
}

type Pod = {
  status: {
    phase: string;
  },
  metadata: {
    name: string;
  }
}

type Ingress = {
  metadata: {
    name: string;
  },
  spec: {
    rules: {
      host: string;
    }[]
  }
}

const NamespaceCard = ({ namespace } : NamespaceCardProps) => {

  // podとingressをとってくる
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logText, setLogText] = useState("");

  const [pods, setPods] = React.useState<Pod[]>([]);
  const [ingresses, setIngresses] = React.useState<Ingress[]>([]);

  useEffect(() => {
    fetch(`/api/namespace/${namespace}/pods`)
      .then(res => res.json())
      .then(data => {
        console.log(data)
        setPods(data);
      })

    fetch(`/api/namespace/${namespace}/ingresses`)
      .then(res => res.json())
      .then(data => {
        setIngresses(data);
      })
  }, []);


  if(pods.length === 0) {
    return <></>
  }

  return (
    <>
      <Modal title="Basic Modal" open={isLogModalOpen} onCancel={() => {
        setIsLogModalOpen(false)
      }}
             footer={(<></>)}
      >
        <pre style={{maxHeight: 300}}>{logText}</pre>
      </Modal>
    <Card>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 10
      }}>
        <div>
          <Typography.Text>{namespace}</Typography.Text>
        </div>
        {
          ingresses.map((ingress) => (
            <Tag color="green" key={ingress.metadata.name}>
              {ingress.spec.rules[0].host}
            </Tag>
          ))
        }
        <div style={{marginLeft: "auto"}}>
          <Typography.Text>{pods[0].status.phase}</Typography.Text>
        </div>
        <Button variant={"solid"} color={"primary"} onClick={() => {
          setIsLogModalOpen(true);
          fetch(`/api/namespace/${namespace}/pod/${pods[0].metadata.name}/log`)
            .then(res => res.json())
            .then(data => {
              setLogText(data.log);
            })
        }}>Log</Button>
        <Button variant={"solid"} color={"danger"} onClick={() => {
          if (window.confirm(`Are you sure to delete ${namespace}?`)) {
            fetch(`/api/namespace/${namespace}/delete`,{
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            })
              .then(res => res.json())
              .then(data => {
                console.log(data);
                // TODO 本当はバックエンドが削除を待つ必要がある
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              })
          }
        }}>Delete</Button>
      </div>
    </Card>
    </>
  )
}

export default NamespaceCard;
